// https://github.com/connectrpc/connect-es/blob/v2.0.0-rc.3/packages/connect-web/src/grpc-web-transport.ts

import type {
    DescMessage,
    DescMethodStreaming,
    DescMethodUnary,
    JsonReadOptions,
    JsonValue,
    JsonWriteOptions,
    MessageInitShape,
    MessageShape,
} from "@bufbuild/protobuf";
import { fromJson } from "@bufbuild/protobuf";
import { AnySchema } from "@bufbuild/protobuf/wkt";
import type {
    ContextValues,
    Interceptor,
    StreamRequest,
    StreamResponse,
    Transport,
    UnaryRequest,
    UnaryResponse,
} from "@connectrpc/connect";
import { Code, ConnectError, createContextValues } from "@connectrpc/connect";
import {
    createClientMethodSerializers,
    createMethodUrl,
    runStreamingCall,
    runUnaryCall,
} from "@connectrpc/connect/protocol";
import { contentTypeJson, headerContentType, headerTimeout } from "@connectrpc/connect/protocol-grpc";

export interface GrpcGatewayTransportOptions {
    baseUrl: string;
    interceptors?: Interceptor[];
    credentials?: RequestCredentials;
    jsonOptions?: Partial<JsonReadOptions & JsonWriteOptions>;
    fetch?: typeof globalThis.fetch;
    defaultTimeoutMs?: number;
}

export function createGrpcGatewayTransport(options: GrpcGatewayTransportOptions): Transport {
    assertFetchApi();
    return {
        async unary<I extends DescMessage, O extends DescMessage>(
            method: DescMethodUnary<I, O>,
            signal: AbortSignal | undefined,
            timeoutMs: number | undefined,
            header: Headers,
            message: MessageInitShape<I>,
            contextValues?: ContextValues,
        ): Promise<UnaryResponse<I, O>> {
            const { serialize, parse } = createClientMethodSerializers(method, false, options.jsonOptions);
            timeoutMs = timeoutMs === undefined ? options.defaultTimeoutMs : timeoutMs <= 0 ? undefined : timeoutMs;
            return runUnaryCall<I, O>({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: false,
                    service: method.parent,
                    method: method,
                    requestMethod: "POST",
                    url: createMethodUrl(options.baseUrl, method),
                    header: requestHeader(timeoutMs, header),
                    contextValues: contextValues ?? createContextValues(),
                    message,
                },
                next: async (req: UnaryRequest<I, O>): Promise<UnaryResponse<I, O>> => {
                    const fetch = options.fetch ?? globalThis.fetch;
                    const response = await fetch(req.url, {
                        credentials: options.credentials ?? "same-origin",
                        redirect: "error",
                        mode: "cors",
                        method: req.requestMethod,
                        headers: req.header,
                        signal: req.signal,
                        body: serialize(req.message),
                    });
                    if (!response.body) {
                        throw new Error("missing response body");
                    }
                    const data: Uint8Array = new Uint8Array(await response.arrayBuffer());
                    if (response.status < 200 || response.status >= 300) {
                        throw errorFromJsonBytes(
                            data,
                            response.headers,
                            new ConnectError("unexpected error", Code.Unknown),
                            options.jsonOptions,
                        );
                    }
                    return {
                        stream: false,
                        service: method.parent,
                        method: method,
                        header: response.headers,
                        message: parse(data),
                        trailer: new Headers(),
                    };
                },
            });
        },
        async stream<I extends DescMessage, O extends DescMessage>(
            method: DescMethodStreaming<I, O>,
            signal: AbortSignal | undefined,
            timeoutMs: number | undefined,
            header: HeadersInit | undefined,
            input: AsyncIterable<MessageInitShape<I>>,
            contextValues?: ContextValues,
        ): Promise<StreamResponse<I, O>> {
            const serialize = createClientMethodSerializers(method, false, options.jsonOptions).serialize;
            const parseJson = (value: JsonValue) => fromJson(method.output, value, options.jsonOptions);
            timeoutMs = timeoutMs === undefined ? options.defaultTimeoutMs : timeoutMs <= 0 ? undefined : timeoutMs;
            return runStreamingCall<I, O>({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: true,
                    service: method.parent,
                    method: method,
                    requestMethod: "POST",
                    url: createMethodUrl(options.baseUrl, method),
                    header: requestHeader(timeoutMs, header),
                    contextValues: contextValues ?? createContextValues(),
                    message: input,
                },
                next: async (req: StreamRequest<I, O>): Promise<StreamResponse<I, O>> => {
                    if (method.methodKind != "server_streaming") {
                        throw new Error("The fetch API does not support streaming request bodies");
                    }
                    const result = await req.message[Symbol.asyncIterator]().next();
                    if (result.done) {
                        throw new Error("missing request message");
                    }
                    const fetch = options.fetch ?? globalThis.fetch;
                    const response = await fetch(req.url, {
                        credentials: options.credentials ?? "same-origin",
                        redirect: "error",
                        mode: "cors",
                        method: req.requestMethod,
                        headers: req.header,
                        signal: req.signal,
                        body: serialize(result.value),
                    });
                    if (!response.body) {
                        throw new Error("missing response body");
                    }
                    if (response.status < 200 || response.status >= 300) {
                        throw errorFromJsonBytes(
                            new Uint8Array(await response.arrayBuffer()),
                            response.headers,
                            new ConnectError("unexpected error", Code.Unknown),
                            options.jsonOptions,
                        );
                    }
                    return {
                        stream: true,
                        service: method.parent,
                        method: method,
                        header: new Headers(),
                        message: readAsyncIterable(response.body, parseJson, new TextDecoder()),
                        trailer: new Headers(),
                    };
                },
            });
        },
    };
}

function assertFetchApi(): void {
    try {
        new Headers();
    } catch (_) {
        throw new Error("grpc gateway transport requires the fetch API.");
    }
}

function requestHeader(timeoutMs: number | undefined, providedHeaders: HeadersInit | undefined): Headers {
    const result = new Headers(providedHeaders ?? {});
    result.set(headerContentType, contentTypeJson);
    if (timeoutMs !== undefined) {
        result.set(headerTimeout, `${timeoutMs.toString(10)}m`);
    }
    return result;
}

function isErrorState(value: unknown): value is { code: number; message: string; details?: JsonValue[] } {
    return (
        value !== null &&
        typeof value === "object" &&
        "code" in value &&
        typeof value.code === "number" &&
        "message" in value &&
        typeof value.message === "string"
    );
}

function isStreamValue(value: unknown): value is { result: JsonValue } {
    return value !== null && typeof value === "object" && "result" in value && value.result !== null;
}

function isStreamError(value: unknown): value is { error: JsonValue } {
    return value !== null && typeof value === "object" && "error" in value && value.error !== null;
}

function errorFromJsonValue(
    value: unknown,
    metadata: HeadersInit,
    fallback: ConnectError,
    options?: Partial<JsonReadOptions>,
): ConnectError {
    let errorState;
    if (isErrorState(value)) {
        errorState = value;
    } else if (isStreamError(value) && isErrorState(value.error)) {
        errorState = value.error;
    } else {
        fallback.cause = new Error("unexpected error response");
        throw fallback;
    }
    const error = new ConnectError(errorState.message, errorState.code, metadata);
    error.details =
        errorState.details?.map((d) => {
            const any = fromJson(AnySchema, d, options);
            return {
                type: any.typeUrl.replace(/^type\.googleapis\.com\//, ""),
                value: any.value,
                debug: d,
            };
        }) ?? [];
    return error;
}

function errorFromJsonBytes(
    bytes: Uint8Array,
    metadata: HeadersInit,
    fallback: ConnectError,
    options?: Partial<JsonReadOptions>,
): ConnectError {
    let value: unknown;
    try {
        value = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
        fallback.cause = e;
        throw fallback;
    }
    return errorFromJsonValue(value, metadata, fallback, options);
}

async function* readAsyncIterable<O extends DescMessage>(
    stream: ReadableStream<Uint8Array>,
    parseJson: (data: JsonValue) => MessageShape<O>,
    decoder: TextDecoder,
): AsyncIterable<MessageShape<O>> {
    const reader = stream.getReader();
    let buffer = "";
    for await (const chunk of { [Symbol.asyncIterator]: () => ({ next: () => reader.read() }) }) {
        buffer += decoder.decode(chunk, { stream: true });
        const chunks = buffer.split(/\r?\n/);
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
            const item: unknown = JSON.parse(chunk);
            if (isStreamValue(item)) {
                yield parseJson(item.result);
            } else if (isStreamError(item)) {
                throw errorFromJsonValue(item.error, new Headers(), new ConnectError("unexpected error", Code.Unknown));
            } else {
                throw new Error("unexpected stream result");
            }
        }
    }
}

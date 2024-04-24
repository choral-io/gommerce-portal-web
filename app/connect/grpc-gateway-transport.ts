// https://github.com/connectrpc/connect-es/blob/v1.4.0/packages/connect-web/src/grpc-web-transport.ts

import type {
    AnyMessage,
    JsonReadOptions,
    JsonValue,
    JsonWriteOptions,
    Message,
    MessageType,
    MethodInfo,
    PartialMessage,
    ServiceType,
} from "@bufbuild/protobuf";
import { Any, MethodKind } from "@bufbuild/protobuf";
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
import { createMethodUrl, runStreamingCall, runUnaryCall } from "@connectrpc/connect/protocol";
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
    const decoder = new TextDecoder();
    return {
        async unary<I extends Message<I> = AnyMessage, O extends Message<O> = AnyMessage>(
            service: ServiceType,
            method: MethodInfo<I, O>,
            signal: AbortSignal | undefined,
            timeoutMs: number | undefined,
            header: Headers,
            message: PartialMessage<I>,
            contextValues?: ContextValues,
        ): Promise<UnaryResponse<I, O>> {
            timeoutMs = timeoutMs === undefined ? options.defaultTimeoutMs : timeoutMs <= 0 ? undefined : timeoutMs;
            return runUnaryCall<I, O>({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: false,
                    service,
                    method,
                    url: createMethodUrl(options.baseUrl, service, method),
                    init: {
                        method: "POST",
                        credentials: options.credentials ?? "same-origin",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: requestHeader(timeoutMs, header),
                    contextValues: contextValues ?? createContextValues(),
                    message,
                },
                next: async (req: UnaryRequest<I, O>): Promise<UnaryResponse<I, O>> => {
                    const fetch = options.fetch ?? globalThis.fetch;
                    const response = await fetch(req.url, {
                        ...req.init,
                        headers: req.header,
                        signal: req.signal,
                        body: req.message.toJsonString(options.jsonOptions),
                    });
                    if (!response.body) {
                        throw new Error("missing response body");
                    }
                    await validateResponse(response);
                    return {
                        stream: false,
                        service,
                        method,
                        header: response.headers,
                        message: method.O.fromJsonString(await response.text(), options.jsonOptions),
                        trailer: new Headers(),
                    };
                },
            });
        },
        async stream<I extends Message<I> = AnyMessage, O extends Message<O> = AnyMessage>(
            service: ServiceType,
            method: MethodInfo<I, O>,
            signal: AbortSignal | undefined,
            timeoutMs: number | undefined,
            header: HeadersInit | undefined,
            input: AsyncIterable<PartialMessage<I>>,
            contextValues?: ContextValues,
        ): Promise<StreamResponse<I, O>> {
            timeoutMs = timeoutMs === undefined ? options.defaultTimeoutMs : timeoutMs <= 0 ? undefined : timeoutMs;
            return runStreamingCall<I, O>({
                interceptors: options.interceptors,
                signal,
                timeoutMs,
                req: {
                    stream: true,
                    service,
                    method,
                    url: createMethodUrl(options.baseUrl, service, method),
                    init: {
                        method: "POST",
                        credentials: options.credentials ?? "same-origin",
                        redirect: "error",
                        mode: "cors",
                    },
                    header: requestHeader(timeoutMs, header),
                    contextValues: contextValues ?? createContextValues(),
                    message: input,
                },
                next: async (req: StreamRequest<I, O>): Promise<StreamResponse<I, O>> => {
                    if (method.kind != MethodKind.ServerStreaming) {
                        throw new Error("The fetch API does not support streaming request bodies");
                    }
                    const result = await req.message[Symbol.asyncIterator]().next();
                    if (result.done) {
                        throw new Error("missing request message");
                    }
                    const message = result.value;
                    const fetch = options.fetch ?? globalThis.fetch;
                    const response = await fetch(req.url, {
                        ...req.init,
                        headers: req.header,
                        signal: req.signal,
                        body: message.toJsonString(options.jsonOptions),
                    });
                    if (!response.body) {
                        throw new Error("missing response body");
                    }
                    await validateResponse(response);
                    return {
                        stream: true,
                        service,
                        method,
                        header: response.headers,
                        message: readAsyncIterable(response.body, method.O, decoder, options.jsonOptions),
                        trailer: new Headers(),
                    };
                },
            });
        },
    };
}

function isStreamItem(value: unknown): value is { result: JsonValue } {
    return value !== null && typeof value === "object" && "result" in value;
}

async function* readAsyncIterable<O extends Message<O>>(
    stream: ReadableStream<Uint8Array>,
    output: MessageType<O>,
    decoder: TextDecoder,
    options?: Partial<JsonReadOptions>,
): AsyncIterable<O> {
    const reader = stream.getReader();
    let buffer = "";
    for await (const chunk of { [Symbol.asyncIterator]: () => ({ next: () => reader.read() }) }) {
        buffer += decoder.decode(chunk, { stream: true });
        const chunks = buffer.split(/\r?\n/);
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
            const item: unknown = JSON.parse(chunk);
            if (isStreamItem(item)) {
                yield output.fromJson(item.result, options);
            } else {
                throw new Error("unexpected stream result");
            }
        }
    }
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

async function validateResponse(response: Response, options?: Partial<JsonReadOptions>): Promise<void> {
    if (response.status < 200 || response.status >= 300) {
        const content = await response.text();
        const errorState: unknown = JSON.parse(content);
        if (isErrorState(errorState)) {
            const details: Message[] = [];
            if (Array.isArray(errorState.details)) {
                const tr = options?.typeRegistry;
                for (const detail of errorState.details) {
                    const item = Any.fromJson(detail, options);
                    details.push(tr ? item.unpack(tr) ?? item : item);
                }
            }
            throw new ConnectError(errorState.message, errorState.code, undefined, details);
        } else {
            throw new ConnectError("unexpected error", Code.Unknown);
        }
    }
}

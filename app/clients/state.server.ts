import type { SessionData, SessionIdStorageStrategy, SessionStorage } from "@remix-run/node";
import { createSessionStorage } from "@remix-run/node";
import type { FlashSessionData } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { v4 as uuidv4 } from "uuid";
import { stateStoreServiceClient as stateStore } from "~/clients/grpc.server";

invariant(
    typeof process.env.GOMMERCE_CLIENT_TOKEN === "string",
    "environment variable GOMMERCE_CLIENT_TOKEN is required.",
);

const clientToken = process.env.GOMMERCE_CLIENT_TOKEN;

interface CookieSessionStorageOptions {
    bucket?: string;
    cookie?: SessionIdStorageStrategy["cookie"];
}

export function createStateSessionStorage<Data = SessionData, FlashData = Data>(
    options?: CookieSessionStorageOptions,
): SessionStorage<Data, FlashData> {
    const bucket = options?.bucket ?? "sessions";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const upsert = async (id: string, data: string, expires?: Date): Promise<void> => {
        const key = `${bucket}:${id}`;
        const metadata: Record<string, string> = {};
        if (expires) {
            metadata.ttlInSeconds = Math.floor((expires.getTime() - Date.now()) / 1000).toString(10);
        }
        await stateStore.setState(
            {
                key,
                data: encoder.encode(data),
                metadata,
                contentType: "application/json",
            },
            { headers: { Authorization: `Basic ${clientToken}` } },
        );
    };
    return createSessionStorage<Data, FlashData>({
        cookie: options?.cookie,
        async createData(data, expires) {
            const id = uuidv4();
            await upsert(id, JSON.stringify(data), expires);
            return id;
        },
        async readData(id) {
            const key = `${bucket}:${id}`;
            const { data } = await stateStore.getState({ key }, { headers: { Authorization: `Basic ${clientToken}` } });
            return data.length > 0 ? (JSON.parse(decoder.decode(data)) as FlashSessionData<Data, FlashData>) : null;
        },
        async updateData(id, data, expires) {
            await upsert(id, JSON.stringify(data), expires);
        },
        async deleteData(id) {
            const key = `${bucket}:${id}`;
            await stateStore.delState({ key }, { headers: { Authorization: `Basic ${clientToken}` } });
        },
    });
}

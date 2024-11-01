import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { ChatsService } from "@proto/chats/v1beta/chats_connect";
import { TokensService } from "@proto/iam/v1beta/tokens_connect";
import { UsersService } from "@proto/iam/v1beta/users_connect";
import { StateStoreService } from "@proto/state/v1beta/store_connect";
import { DateTimeService, PasswordService, SnowflakeService } from "@proto/utils/v1/utils_connect";
import invariant from "tiny-invariant";
import { singleton } from "~/singleton.server";

invariant(
    typeof process.env.GOMMERCE_GRPC_ENDPOINT === "string",
    "environment variable GOMMERCE_GRPC_ENDPOINT is required.",
);

const endpoint = process.env.GOMMERCE_GRPC_ENDPOINT;

export const transport = singleton("grpc_transport", () => {
    return createGrpcTransport({
        baseUrl: endpoint,
        useBinaryFormat: true,
        httpVersion: "2",
    });
});

// utils/v1
export const snowflakeServiceClient = createClient(SnowflakeService, transport);
export const passwordServiceClient = createClient(PasswordService, transport);
export const dateTimeServiceClient = createClient(DateTimeService, transport);

// state/v1beta
export const stateStoreServiceClient = createClient(StateStoreService, transport);

// iam/v1beta
export const usersServiceClient = createClient(UsersService, transport);
export const tokensServiceClient = createClient(TokensService, transport);

// chats/v1beta
export const chatsServiceClient = createClient(ChatsService, transport);

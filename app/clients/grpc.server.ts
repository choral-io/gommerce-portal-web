import invariant from "tiny-invariant";
import { SnowflakeService, PasswordService, DateTimeService } from "@proto/utils/v1/utils_connect";
import { StateStoreService } from "@proto/state/v1beta/store_connect";
import { UsersService } from "@proto/iam/v1beta/users_connect";
import { TokensService } from "@proto/iam/v1beta/tokens_connect";
import { ChatsService } from "@proto/chats/v1beta/chats_connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { createPromiseClient } from "@connectrpc/connect";
import { singleton } from "~/singleton.server";

invariant(process.env.GOMMERCE_GRPC_ENDPOINT, "environment variable GOMMERCE_GRPC_ENDPOINT is required.");

const endpoint = process.env.GOMMERCE_GRPC_ENDPOINT;

export const transport = singleton("grpc_transport", () => {
    return createGrpcTransport({
        baseUrl: endpoint,
        useBinaryFormat: true,
        httpVersion: "2",
    });
});

// utils/v1
export const snowflakeServiceClient = createPromiseClient(SnowflakeService, transport);
export const passwordServiceClient = createPromiseClient(PasswordService, transport);
export const dateTimeServiceClient = createPromiseClient(DateTimeService, transport);

// state/v1beta
export const stateStoreServiceClient = createPromiseClient(StateStoreService, transport);

// iam/v1beta
export const usersServiceClient = createPromiseClient(UsersService, transport);
export const tokensServiceClient = createPromiseClient(TokensService, transport);

// chats/v1beta
export const chatsServiceClient = createPromiseClient(ChatsService, transport);

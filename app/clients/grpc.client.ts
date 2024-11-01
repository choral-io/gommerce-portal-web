import { createRegistry } from "@bufbuild/protobuf";
import { ChatsService } from "@proto/chats/v1beta/chats_connect";
import { TokensService } from "@proto/iam/v1beta/tokens_connect";
import { UsersService } from "@proto/iam/v1beta/users_connect";
import { StateStoreService } from "@proto/state/v1beta/store_connect";
import { DateTimeService, PasswordService, SnowflakeService } from "@proto/utils/v1/utils_connect";
import invariant from "tiny-invariant";
import { createClient, createGrpcGatewayTransport, googleRpcTypes } from "~/connect";

invariant(
    typeof import.meta.env.VITE_GRPC_ENDPOINT === "string",
    "environment variable VITE_GRPC_ENDPOINT is required.",
);

const endpoint = import.meta.env.VITE_GRPC_ENDPOINT;

export const transport = createGrpcGatewayTransport({
    baseUrl: endpoint,
    jsonOptions: {
        typeRegistry: createRegistry(...googleRpcTypes),
    },
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

import { createRegistry } from "@bufbuild/protobuf";
import { ChatsService } from "@gommerce/chats/v1beta/chats_pb";
import { TokensService } from "@gommerce/iam/v1beta/tokens_pb";
import { UsersService } from "@gommerce/iam/v1beta/users_pb";
import { StateStoreService } from "@gommerce/state/v1beta/store_pb";
import { DateTimeService, PasswordService, SnowflakeService } from "@gommerce/utils/v1/utils_pb";
import invariant from "tiny-invariant";
import { createClient, createGrpcGatewayTransport, googleRpcTypes, wellKnownTypes } from "~/connect";

invariant(
    typeof import.meta.env.VITE_GRPC_ENDPOINT === "string",
    "environment variable VITE_GRPC_ENDPOINT is required.",
);

const endpoint = import.meta.env.VITE_GRPC_ENDPOINT;

export const transport = createGrpcGatewayTransport({
    baseUrl: endpoint,
    jsonOptions: {
        registry: createRegistry(...googleRpcTypes, ...wellKnownTypes),
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

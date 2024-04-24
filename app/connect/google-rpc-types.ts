import type { MessageType } from "@bufbuild/protobuf";
import {
    ErrorInfo,
    RetryInfo,
    DebugInfo,
    QuotaFailure,
    PreconditionFailure,
    BadRequest,
    RequestInfo,
    ResourceInfo,
    Help,
    LocalizedMessage,
} from "@proto/rpc/error_details_pb";
import { HttpHeader, HttpRequest, HttpResponse } from "@proto/rpc/http_pb";
import { Status } from "@proto/rpc/status_pb";
import { AttributeContext } from "@proto/rpc/context/attribute_context_pb";
import { AuditContext } from "@proto/rpc/context/audit_context_pb";

export const googleRpcTypes: MessageType[] = [
    ErrorInfo,
    RetryInfo,
    DebugInfo,
    QuotaFailure,
    PreconditionFailure,
    BadRequest,
    RequestInfo,
    ResourceInfo,
    Help,
    LocalizedMessage,
    HttpHeader,
    HttpRequest,
    HttpResponse,
    Status,
    AttributeContext,
    AuditContext,
];

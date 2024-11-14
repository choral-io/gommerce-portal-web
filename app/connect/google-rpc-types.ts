import { AttributeContextSchema } from "@google/rpc/context/attribute_context_pb";
import { AuditContextSchema } from "@google/rpc/context/audit_context_pb";
import {
    BadRequestSchema,
    DebugInfoSchema,
    ErrorInfoSchema,
    HelpSchema,
    LocalizedMessageSchema,
    PreconditionFailureSchema,
    QuotaFailureSchema,
    RequestInfoSchema,
    ResourceInfoSchema,
    RetryInfoSchema,
} from "@google/rpc/error_details_pb";
import { HttpHeaderSchema, HttpRequestSchema, HttpResponseSchema } from "@google/rpc/http_pb";
import { StatusSchema } from "@google/rpc/status_pb";

export const googleRpcTypes = [
    ErrorInfoSchema,
    RetryInfoSchema,
    DebugInfoSchema,
    QuotaFailureSchema,
    PreconditionFailureSchema,
    BadRequestSchema,
    RequestInfoSchema,
    ResourceInfoSchema,
    HelpSchema,
    LocalizedMessageSchema,
    HttpHeaderSchema,
    HttpRequestSchema,
    HttpResponseSchema,
    StatusSchema,
    AttributeContextSchema,
    AuditContextSchema,
];

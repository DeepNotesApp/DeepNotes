import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { byteB64 } from "./sessions.js";

extendZodWithOpenApi(z);

export const nanoidIdOpenapi = {
  description: "21-character nanoid (URL-safe alphabet).",
  example: "V1StGXR8_Z5jdHi6B-myT",
} as const;

export const groupIdPathSchema = z.object({
  groupId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "groupId", in: "path" } }),
});

export const userGroupIdsResponseSchema = z
  .object({
    groupIds: z.array(z.string()),
  })
  .openapi("UserGroupIdsResponse");

export const groupPagesListResponseSchema = z
  .object({
    pageIds: z.array(z.string()),
    hasMore: z.boolean(),
  })
  .openapi("GroupPagesListResponse");

export const groupPagesListQuerySchema = z.object({
  lastPageId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .optional()
    .openapi({
      description:
        "Pagination cursor: return pages older than this page's activity (legacy `lastPageId`).",
      param: { name: "lastPageId", in: "query" },
    }),
});

export const groupPageCreateRequestSchema = z
  .object({
    parentPageId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{21}$/)
      .openapi(nanoidIdOpenapi),
    pageId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{21}$/)
      .openapi(nanoidIdOpenapi),
    pageEncryptedSymmetricKeyring: byteB64,
    pageEncryptedRelativeTitle: byteB64,
    pageEncryptedAbsoluteTitle: byteB64,
  })
  .openapi("GroupPageCreateRequest");

export const groupPageCreateResponseSchema = z
  .object({
    pageId: z.string(),
    numFreePages: z.number().int().optional(),
  })
  .openapi("GroupPageCreateResponse");

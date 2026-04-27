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

export const groupMainPageResponseSchema = z
  .object({
    mainPageId: z.string(),
  })
  .openapi("GroupMainPageResponse");

export const groupMemberUserIdsResponseSchema = z
  .object({
    userIds: z.array(z.string()),
  })
  .openapi("GroupMemberUserIdsResponse");

/** Same material as legacy `groupPasswordHash` (Argon2id pre-hash input on the client), base64. */
export const groupPasswordEnableRequestSchema = z
  .object({
    groupPasswordHash: byteB64,
    groupEncryptedContentKeyring: byteB64,
  })
  .openapi("GroupPasswordEnableRequest");

export const groupPasswordChangeRequestSchema = z
  .object({
    groupCurrentPasswordHash: byteB64,
    groupNewPasswordHash: byteB64,
    groupEncryptedContentKeyring: byteB64,
  })
  .openapi("GroupPasswordChangeRequest");

export const groupPasswordDisableRequestSchema = z
  .object({
    groupPasswordHash: byteB64,
    groupEncryptedContentKeyring: byteB64,
  })
  .openapi("GroupPasswordDisableRequest");

export const groupPrivacyPublicRequestSchema = z
  .object({
    accessKeyring: byteB64,
  })
  .openapi("GroupPrivacyPublicRequest");

export const groupPrivacyJoinRequestsPatchSchema = z
  .object({
    areJoinRequestsAllowed: z.boolean(),
  })
  .openapi("GroupPrivacyJoinRequestsPatch");

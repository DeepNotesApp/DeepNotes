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

/** Ciphertext to create a non-personal group (legacy `groupCreation` on `pages.create` / `pages.move`). */
export const pageMoveGroupCreationRequestSchema = z
  .object({
    groupEncryptedName: byteB64,
    groupPasswordHash: byteB64.optional(),
    groupIsPublic: z.boolean(),
    groupAccessKeyring: byteB64,
    groupEncryptedInternalKeyring: byteB64,
    groupEncryptedContentKeyring: byteB64,
    groupPublicKeyring: byteB64,
    groupEncryptedPrivateKeyring: byteB64,
    groupOwnerEncryptedName: byteB64,
  })
  .openapi("PageMoveGroupCreationRequest");

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
    groupCreation: pageMoveGroupCreationRequestSchema.optional(),
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

const nanoidRecordKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{21}$/, "expected nanoid id");

const groupPrivacyPrivateMemberSchema = z
  .object({
    encryptedAccessKeyring: byteB64.optional(),
    encryptedInternalKeyring: byteB64,
    encryptedName: byteB64.nullable(),
  })
  .openapi("GroupPrivacyPrivateMember");

const groupPrivacyPrivateInvitationSchema = z
  .object({
    encryptedAccessKeyring: byteB64.optional(),
    encryptedInternalKeyring: byteB64,
    encryptedName: byteB64,
  })
  .openapi("GroupPrivacyPrivateInvitation");

const groupPrivacyPrivateJoinRequestSchema = z
  .object({
    encryptedName: byteB64,
  })
  .openapi("GroupPrivacyPrivateJoinRequest");

const groupPrivacyPrivatePageSchema = z
  .object({
    encryptedSymmetricKeyring: byteB64,
  })
  .openapi("GroupPrivacyPrivatePage");

/**
 * Re-key payload for `POST …/privacy/private` (legacy WS `groups.privacy.makePrivate` step 2 + `rotateGroupKeys` in one call).
 * Record keys are user ids (members, invitations, requests) or page ids; must match current DB rows exactly.
 */
export const groupPrivacyPrivateRequestSchema = z
  .object({
    groupAccessKeyring: byteB64.optional(),
    groupEncryptedName: byteB64,
    groupEncryptedContentKeyring: byteB64,
    groupPublicKeyring: byteB64,
    groupEncryptedPrivateKeyring: byteB64,
    groupMembers: z.record(nanoidRecordKeySchema, groupPrivacyPrivateMemberSchema),
    groupJoinInvitations: z.record(
      nanoidRecordKeySchema,
      groupPrivacyPrivateInvitationSchema,
    ),
    groupJoinRequests: z.record(
      nanoidRecordKeySchema,
      groupPrivacyPrivateJoinRequestSchema,
    ),
    groupPages: z.record(nanoidRecordKeySchema, groupPrivacyPrivatePageSchema),
  })
  .openapi("GroupPrivacyPrivateRequest");

export type GroupPrivacyPrivateRequest = z.infer<
  typeof groupPrivacyPrivateRequestSchema
>;

export const pageIdPathSchema = z.object({
  pageId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "pageId", in: "path" } }),
});

export const pageTargetPagePathSchema = z.object({
  pageId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "pageId", in: "path" } }),
  targetPageId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "targetPageId", in: "path" } }),
});

export const pageSnapshotPathSchema = z.object({
  pageId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "pageId", in: "path" } }),
  snapshotId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "snapshotId", in: "path" } }),
});

/** Optional breadcrumb parent for `pages.bump` (must chain to personal main page). */
export const pageBumpRequestSchema = z
  .object({
    parentPageId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{21}$/)
      .optional(),
  })
  .openapi("PageBumpRequest");

/** Ciphertext to persist after a cross-group move (legacy `pageKeyRotationSchema` + Yjs update). */
export const pageMoveReencryptRequestSchema = z
  .object({
    pageEncryptedSymmetricKeyring: byteB64,
    pageEncryptedRelativeTitle: byteB64,
    pageEncryptedAbsoluteTitle: byteB64,
    pageEncryptedUpdate: byteB64,
    pageEncryptedSnapshots: z
      .record(
        nanoidRecordKeySchema,
        z.object({
          encryptedSymmetricKey: byteB64,
          encryptedData: byteB64,
        }),
      )
      .default({}),
  })
  .openapi("PageMoveReencryptRequest");

/**
 * Replaces `websocket/pages/move` (two tRPC steps) with one `POST` (optional `reencrypt` when
 * `sourceGroupId !== destGroupId`). Optional `groupCreation` uses `PageMoveGroupCreationRequest`.
 */
export const pageMoveRequestSchema = z
  .object({
    destGroupId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{21}$/)
      .openapi(nanoidIdOpenapi),
    setAsMainPage: z.boolean(),
    groupCreation: pageMoveGroupCreationRequestSchema.optional(),
    reencrypt: pageMoveReencryptRequestSchema.optional(),
  })
  .openapi("PageMoveRequest");

export const pageBacklinkCreateRequestSchema = z
  .object({
    sourcePageId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{21}$/)
      .openapi(nanoidIdOpenapi),
  })
  .openapi("PageBacklinkCreateRequest");

export const pageSnapshotSaveRequestSchema = z
  .object({
    encryptedSymmetricKey: byteB64,
    encryptedData: byteB64,
    preRestore: z.boolean().optional(),
  })
  .openapi("PageSnapshotSaveRequest");

export const pageSnapshotCreateResponseSchema = z
  .object({
    snapshotId: z.string(),
  })
  .openapi("PageSnapshotCreateResponse");

export const pageSnapshotLoadResponseSchema = z
  .object({
    encryptedSymmetricKey: z.string().nullable(),
    encryptedData: z
      .string()
      .openapi({ format: "byte", description: "Base64 ciphertext." }),
  })
  .openapi("PageSnapshotLoadResponse");

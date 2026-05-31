import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { byteB64 } from "./sessions.js";

extendZodWithOpenApi(z);

export const nanoidIdOpenapi = {
  description: "21-character nanoid (URL-safe alphabet).",
  example: "V1StGXR8_Z5jdHi6B-myT",
} as const;

export const deepnotesNotificationTypeValues = [
  "group-request-sent",
  "group-request-canceled",
  "group-request-accepted",
  "group-request-rejected",
  "group-invitation-sent",
  "group-invitation-canceled",
  "group-invitation-accepted",
  "group-invitation-rejected",
  "group-member-role-changed",
  "group-member-removed",
] as const;

export const deepnotesNotificationTypeSchema = z
  .enum(deepnotesNotificationTypeValues)
  .openapi("DeepnotesNotificationType");

export const groupInviteNotificationPayloadSchema = z
  .object({
    type: deepnotesNotificationTypeSchema,
    encryptedContent: byteB64,
    recipients: z.record(
      z
        .string()
        .regex(/^[A-Za-z0-9_-]{21}$/)
        .openapi(nanoidIdOpenapi),
      z.object({
        encryptedSymmetricKey: byteB64,
      }),
    ),
  })
  .openapi("GroupInviteNotificationPayload");

/** Optional `?inviteeUserId=` for manager invite flows (notification recipient keyrings). */
export const groupInviteCryptoBootstrapQuerySchema = z.object({
  inviteeUserId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .optional()
    .openapi({
      ...nanoidIdOpenapi,
      param: { name: "inviteeUserId", in: "query" },
      description:
        "When set, includes public keyrings for group managers and this user so the SPA can build `notifications` on `POST …/join-invitations`.",
    }),
});

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

/** Base64 to bytes; allows empty string → zero-length `Uint8Array` (personal / empty ciphertext). */
const byteB64EmptyOk = z
  .string()
  .openapi({
    format: "byte",
    description: "Standard base64; empty string means zero-length binary.",
  })
  .transform((s) =>
    s === "" ? new Uint8Array(0) : new Uint8Array(Buffer.from(s, "base64")),
  );

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
    groupEncryptedName: byteB64EmptyOk,
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

export const groupMemberRoleSchema = z
  .enum(["owner", "admin", "moderator", "member", "viewer"])
  .openapi("GroupMemberRole");

const groupMemberRowSchema = z
  .object({
    userId: z.string(),
    role: groupMemberRoleSchema,
  })
  .openapi("GroupMemberRow");

const groupPendingInvitationRowSchema = z
  .object({
    userId: z.string(),
    role: groupMemberRoleSchema,
  })
  .openapi("GroupPendingInvitationRow");

const groupPendingJoinRequestRowSchema = z
  .object({
    userId: z.string(),
  })
  .openapi("GroupPendingJoinRequestRow");

/** Roles + pending flows for authenticated members (`viewGroupMembers`). */
export const groupMembersDetailResponseSchema = z
  .object({
    viewerUserId: z.string(),
    viewerRole: groupMemberRoleSchema,
    groupIsPublic: z.boolean(),
    joinRequestsAllowed: z.boolean(),
    members: z.array(groupMemberRowSchema),
    pendingInvitations: z.array(groupPendingInvitationRowSchema),
    pendingJoinRequests: z.array(groupPendingJoinRequestRowSchema),
  })
  .openapi("GroupMembersDetailResponse");

const notificationRecipientPublicKeyringRowSchema = z
  .object({
    userId: z.string().openapi(nanoidIdOpenapi),
    publicKeyring: byteB64,
  })
  .openapi("NotificationRecipientPublicKeyringRow");

/** Encrypted blobs so the SPA can build invitation / join-request-accept ciphertext (managers). */
export const groupInviteCryptoBootstrapResponseSchema = z
  .object({
    groupPublicKeyring: byteB64,
    groupAccessKeyring: byteB64.nullable(),
    memberEncryptedAccessKeyring: byteB64.nullable(),
    memberEncryptedInternalKeyring: byteB64,
    /** Present when `?inviteeUserId=` was set; managers ∪ invitee for E2EE notifications. */
    notificationRecipientPublicKeyrings: z
      .array(notificationRecipientPublicKeyringRowSchema)
      .optional(),
  })
  .openapi("GroupInviteCryptoBootstrapResponse");

/** Destination group ciphertext for client-side unwrap (`PageKeyring` re-wrap on cross-group move). */
export const groupCollabCryptoContextResponseSchema = z
  .object({
    groupEncryptedContentKeyring: byteB64,
    groupAccessKeyring: byteB64.nullable(),
    memberEncryptedAccessKeyring: byteB64.nullable(),
  })
  .openapi("GroupCollabCryptoContextResponse");

const groupPrivacyMakePrivateMemberBootstrapSchema = z
  .object({
    publicKeyring: z
      .string()
      .openapi({ format: "byte", description: "Invitee/member `users.public_keyring` (base64)." }),
    encryptedName: z
      .string()
      .nullable()
      .openapi({
        format: "byte",
        description: "`group_members.encrypted_name` (base64) or null.",
      }),
  })
  .openapi("GroupPrivacyMakePrivateMemberBootstrap");

const groupPrivacyMakePrivateInvitationBootstrapSchema = z
  .object({
    publicKeyring: z.string().openapi({ format: "byte" }),
    encryptedName: z.string().openapi({ format: "byte" }),
  })
  .openapi("GroupPrivacyMakePrivateInvitationBootstrap");

const groupPrivacyMakePrivateJoinRequestBootstrapSchema = z
  .object({
    encryptedName: z.string().openapi({ format: "byte" }),
  })
  .openapi("GroupPrivacyMakePrivateJoinRequestBootstrap");

const groupPrivacyMakePrivatePageBootstrapSchema = z
  .object({
    encryptedSymmetricKeyring: z.string().openapi({ format: "byte" }),
  })
  .openapi("GroupPrivacyMakePrivatePageBootstrap");

/**
 * Read model for `POST …/privacy/private` body construction (legacy WS make-private step 1).
 */
export const groupPrivacyMakePrivateBootstrapResponseSchema = z
  .object({
    groupAccessKeyring: z
      .string()
      .nullable()
      .openapi({ format: "byte" }),
    groupEncryptedName: z.string().openapi({ format: "byte" }),
    groupEncryptedContentKeyring: z.string().openapi({ format: "byte" }),
    groupPublicKeyring: z.string().openapi({ format: "byte" }),
    groupEncryptedPrivateKeyring: z.string().openapi({ format: "byte" }),
    groupEncryptedAccessKeyring: z
      .string()
      .nullable()
      .openapi({
        format: "byte",
        description: "Viewer’s `group_members.encrypted_access_keyring` (often null when public).",
      }),
    groupEncryptedInternalKeyring: z.string().openapi({ format: "byte" }),
    groupMembers: z.record(
      nanoidRecordKeySchema,
      groupPrivacyMakePrivateMemberBootstrapSchema,
    ),
    groupJoinInvitations: z.record(
      nanoidRecordKeySchema,
      groupPrivacyMakePrivateInvitationBootstrapSchema,
    ),
    groupJoinRequests: z.record(
      nanoidRecordKeySchema,
      groupPrivacyMakePrivateJoinRequestBootstrapSchema,
    ),
    groupPages: z.record(
      nanoidRecordKeySchema,
      groupPrivacyMakePrivatePageBootstrapSchema,
    ),
  })
  .openapi("GroupPrivacyMakePrivateBootstrapResponse");

/** Group box key for encrypting display names (invite accept, join request, etc.). */
export const groupPublicKeyringResponseSchema = z
  .object({
    groupPublicKeyring: byteB64,
  })
  .openapi("GroupPublicKeyringResponse");

export const groupJoinInvitationSendRequestSchema = z
  .object({
    inviteeUserId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{21}$/)
      .openapi(nanoidIdOpenapi),
    invitationRole: groupMemberRoleSchema,
    /** Required when the group is private (`access_keyring` is null). Omitted / ignored for public groups. */
    encryptedAccessKeyring: byteB64.optional(),
    encryptedInternalKeyring: byteB64,
    userEncryptedName: byteB64,
    userEncryptedNameForUser: byteB64,
    /** Legacy WS step 2: E2EE `notifyUsers` payloads (optional). */
    notifications: z.array(groupInviteNotificationPayloadSchema).optional(),
  })
  .openapi("GroupJoinInvitationSendRequest");

export const groupJoinInvitationAcceptRequestSchema = z
  .object({
    userEncryptedName: byteB64,
  })
  .openapi("GroupJoinInvitationAcceptRequest");

export const groupJoinRequestSendRequestSchema = z
  .object({
    encryptedUserName: byteB64,
    encryptedUserNameForUser: byteB64,
  })
  .openapi("GroupJoinRequestSendRequest");

export const groupJoinRequestAcceptRequestSchema = z
  .object({
    targetRole: groupMemberRoleSchema,
    encryptedAccessKeyring: byteB64.optional(),
    encryptedInternalKeyring: byteB64,
  })
  .openapi("GroupJoinRequestAcceptRequest");

export const groupMemberRolePatchRequestSchema = z
  .object({
    role: groupMemberRoleSchema,
  })
  .openapi("GroupMemberRolePatchRequest");

export const groupUserIdPathSchema = z.object({
  groupId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "groupId", in: "path" } }),
  userId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{21}$/)
    .openapi({ ...nanoidIdOpenapi, param: { name: "userId", in: "path" } }),
});

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

export const pageBacklinkListResponseSchema = z
  .object({
    sourcePageIds: z
      .array(z.string())
      .openapi({
        description:
          "Page IDs that link to this page, ordered by most recent activity.",
      }),
  })
  .openapi("PageBacklinkListResponse");

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

export const pageSnapshotListItemSchema = z
  .object({
    snapshotId: z.string(),
    creationDate: z
      .string()
      .openapi({ description: "ISO-8601 timestamp from `page_snapshots.creation_date`." }),
    type: z.enum(["manual", "pre-restore"]),
  })
  .openapi("PageSnapshotListItem");

export const pageSnapshotListResponseSchema = z
  .object({
    snapshots: z.array(pageSnapshotListItemSchema),
  })
  .openapi("PageSnapshotListResponse");

export const pageSnapshotLoadResponseSchema = z
  .object({
    encryptedSymmetricKey: z.string().nullable(),
    encryptedData: z
      .string()
      .openapi({ format: "byte", description: "Base64 ciphertext." }),
  })
  .openapi("PageSnapshotLoadResponse");

const pageCollabUpdateItemInputSchema = z
  .object({
    index: z
      .number()
      .int()
      .nonnegative()
      .openapi({
        description:
          "Monotonic index (legacy collab / `page_updates.index`, often Yjs clock).",
      }),
    encryptedData: byteB64,
  })
  .openapi("PageCollabUpdateItemInput");

export const pageCollabUpdatesGetQuerySchema = z
  .object({
    sinceIndex: z
      .string()
      .optional()
      .openapi({
        description:
          "If provided, only returns updates with `index > sinceIndex` (exclusive). Used for incremental bootstrap after the first batch.",
      }),
    limit: z
      .string()
      .optional()
      .openapi({
        description: "Max updates to return per request (default 100, max 500).",
      }),
  })
  .openapi("PageCollabUpdatesGetQuery");

export const pageCollabUpdatesAppendRequestSchema = z
  .object({
    expectedLastIndex: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .openapi({
        description:
          "Must match `lastIndex` from GET (`null` when the page has no updates yet).",
      }),
    updates: z.array(pageCollabUpdateItemInputSchema).min(1),
  })
  .openapi("PageCollabUpdatesAppendRequest");

export const pageCollabUpdatesGetResponseSchema = z
  .object({
    lastIndex: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .openapi({
        description: "Max `index` in the database, or null if there are no rows.",
      }),
    updates: z.array(
      z.object({
        index: z.number().int().nonnegative(),
        encryptedData: z
          .string()
          .openapi({
            format: "byte",
            description: "Base64 ciphertext (`page_updates.encrypted_data`).",
          }),
      }),
    ),
    groupId: z.string().openapi({
      description: "Owning group (`pages.group_id`) for access-key + content-key unwrap.",
    }),
    pageEncryptedSymmetricKeyring: byteB64,
    pageEncryptedRelativeTitle: byteB64.openapi({
      description: "`pages.encrypted_relative_title` (re-key on cross-group move).",
    }),
    pageEncryptedAbsoluteTitle: byteB64.openapi({
      description: "`pages.encrypted_absolute_title` (re-key on cross-group move).",
    }),
    groupEncryptedContentKeyring: byteB64,
    groupAccessKeyring: byteB64
      .nullable()
      .openapi({
        description:
          "Public group `access_keyring` bytes when set; otherwise null (use member blob).",
      }),
    memberEncryptedAccessKeyring: byteB64
      .nullable()
      .openapi({
        description:
          "`group_members.encrypted_access_keyring` for this user when present.",
      }),
  })
  .openapi("PageCollabUpdatesGetResponse");

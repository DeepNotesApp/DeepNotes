import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * Login email: normal address or literal `demo` (legacy `sessions.login` parity).
 */
export const sessionLoginEmailSchema = z.union([
  z.string().email(),
  z.literal("demo"),
]);

/**
 * JSON body for `POST /api/sessions/login`.
 * Legacy tRPC sent `loginHash` as raw bytes via superjson; REST uses base64 (OAS `format: byte`).
 */
export const sessionLoginRequestSchema = z
  .object({
    email: sessionLoginEmailSchema,
    loginHash: z.string().openapi({
      description:
        "Base64-encoded login hash (legacy wire used binary; prefer standard base64 in JSON).",
      format: "byte",
    }),
    rememberSession: z.boolean(),
    authenticatorToken: z.string().optional(),
    rememberDevice: z.boolean().optional(),
    recoveryCode: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),
  })
  .openapi("SessionLoginRequest");

export type SessionLoginRequest = z.infer<typeof sessionLoginRequestSchema>;

const nanoidId = z
  .string()
  .length(21)
  .regex(/^[A-Za-z0-9_-]{21}$/, "expected nanoid id");

const byteB64 = z
  .string()
  .min(1)
  .openapi({
    format: "byte",
    description: "Standard base64-encoded binary (legacy tRPC used raw bytes).",
  })
  .transform((s) => new Uint8Array(Buffer.from(s, "base64")));

const sessionDemoGroupCreationSchema = z
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
  .openapi("SessionDemoGroupCreation");

const sessionDemoPageCreationSchema = z
  .object({
    pageEncryptedSymmetricKeyring: byteB64,
    pageEncryptedRelativeTitle: byteB64,
    pageEncryptedAbsoluteTitle: byteB64,
  })
  .openapi("SessionDemoPageCreation");

/**
 * Demo session creation mirrors legacy `sessions.startDemo` input (crypto material + ids).
 */
export const sessionDemoRequestSchema = z
  .object({
    userId: nanoidId,
    groupId: nanoidId,
    pageId: nanoidId,
    userPublicKeyring: byteB64,
    userEncryptedPrivateKeyring: byteB64,
    userEncryptedSymmetricKeyring: byteB64,
    userEncryptedName: byteB64,
    userEncryptedDefaultNote: byteB64,
    userEncryptedDefaultArrow: byteB64,
    groupCreation: sessionDemoGroupCreationSchema,
    pageCreation: sessionDemoPageCreationSchema,
  })
  .openapi("SessionDemoRequest");

export type SessionDemoRequest = z.infer<typeof sessionDemoRequestSchema>;

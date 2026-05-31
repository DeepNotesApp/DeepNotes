import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * Login email: normal address.
 */
export const sessionLoginEmailSchema = z.string().email();

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

/** Base64 JSON field decoded to `Uint8Array` (legacy tRPC used raw bytes). */
export const byteB64 = z
  .string()
  .min(1)
  .openapi({
    format: "byte",
    description: "Standard base64-encoded binary (legacy tRPC used raw bytes).",
  })
  .transform((s) => new Uint8Array(Buffer.from(s, "base64")));

const userRegisterGroupCreationSchema = z
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
  .openapi("UserRegisterGroupCreation");

const userRegisterPageCreationSchema = z
  .object({
    pageEncryptedSymmetricKeyring: byteB64,
    pageEncryptedRelativeTitle: byteB64,
    pageEncryptedAbsoluteTitle: byteB64,
  })
  .openapi("UserRegisterPageCreation");

/**
 * `POST /api/users` — registration with crypto material + ids.
 */
export const userRegisterRequestSchema = z
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
    groupCreation: userRegisterGroupCreationSchema,
    pageCreation: userRegisterPageCreationSchema,
    email: z
      .string()
      .email()
      .transform((e) => e.trim().toLowerCase()),
    loginHash: byteB64,
  })
  .openapi("UserRegisterRequest");

export type UserRegisterRequest = z.infer<typeof userRegisterRequestSchema>;

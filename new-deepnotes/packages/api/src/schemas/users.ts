import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { byteB64 } from "./sessions.js";

extendZodWithOpenApi(z);

export const userMeResponseSchema = z
  .object({
    userId: z.string(),
    emailVerified: z.boolean(),
    demo: z.boolean(),
    personalGroupId: z.string(),
  })
  .openapi("UserMeResponse");

export type UserMeResponse = z.infer<typeof userMeResponseSchema>;

export const userRegisterResponseSchema = z
  .object({
    userId: z.string(),
    emailVerified: z.boolean(),
  })
  .openapi("UserRegisterResponse");

export type UserRegisterResponse = z.infer<typeof userRegisterResponseSchema>;

const nanoidVerificationCode = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]{21}$/, "expected nanoid verification code");

export const emailVerificationResendRequestSchema = z
  .object({
    email: z.string().email(),
  })
  .openapi("EmailVerificationResendRequest");

export const emailVerificationConfirmRequestSchema = z
  .object({
    emailVerificationCode: nanoidVerificationCode,
  })
  .openapi("EmailVerificationConfirmRequest");

/** Body for `DELETE /api/users/me` (replaces legacy `users.account.delete` input). */
export const userAccountDeleteRequestSchema = z
  .object({
    loginHash: z
      .string()
      .min(1)
      .openapi({
        format: "byte",
        description:
          "Base64-encoded login hash (same semantics as `POST /api/sessions/login`).",
      }),
  })
  .openapi("UserAccountDeleteRequest");

export type UserAccountDeleteRequest = z.infer<
  typeof userAccountDeleteRequestSchema
>;

/**
 * `POST /api/users/me/password` — replaces legacy WebSocket
 * `users.account.changePassword` (two-step flow collapsed: client re-wraps
 * keyrings with the new password before calling).
 */
export const userPasswordChangeRequestSchema = z
  .object({
    oldLoginHash: byteB64,
    newLoginHash: byteB64,
    userEncryptedPrivateKeyring: byteB64,
    userEncryptedSymmetricKeyring: byteB64,
  })
  .openapi("UserPasswordChangeRequest");

export type UserPasswordChangeRequest = z.infer<
  typeof userPasswordChangeRequestSchema
>;

const sixDigitCode = z
  .string()
  .regex(/^\d{6}$/, "expected 6-digit verification code");

/**
 * `POST /api/users/me/email-change` — legacy `users.account.emailChange.request`.
 */
export const userEmailChangeRequestSchema = z
  .object({
    oldLoginHash: byteB64,
    newEmail: z.string().email(),
  })
  .openapi("UserEmailChangeRequest");

export type UserEmailChangeRequest = z.infer<typeof userEmailChangeRequestSchema>;

/**
 * When `SEND_EMAILS=false`, the server returns this body (dev / local only).
 */
export const userEmailChangeRequestResponseSchema = z
  .object({
    emailVerificationCode: sixDigitCode,
  })
  .openapi("UserEmailChangeRequestResponse");

/**
 * `POST /api/users/me/email-change/confirm` — legacy WS `emailChange.finish` (two steps as one call).
 */
export const userEmailChangeConfirmRequestSchema = z
  .object({
    oldLoginHash: byteB64,
    emailVerificationCode: sixDigitCode,
    newLoginHash: byteB64,
    userEncryptedPrivateKeyring: byteB64,
    userEncryptedSymmetricKeyring: byteB64,
  })
  .openapi("UserEmailChangeConfirmRequest");

export type UserEmailChangeConfirmRequest = z.infer<
  typeof userEmailChangeConfirmRequestSchema
>;

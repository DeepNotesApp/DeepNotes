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

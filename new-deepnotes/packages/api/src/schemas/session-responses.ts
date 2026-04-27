import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const sessionErrorResponseSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .openapi("SessionErrorResponse");

export const sessionLoginSuccessSchema = z
  .object({
    userId: z.string(),
    sessionId: z.string(),
    sessionKey: z.string().openapi({
      description: "Base64-encoded session symmetric key.",
      format: "byte",
    }),
    personalGroupId: z.string(),
    publicKeyring: z.string().openapi({ format: "byte" }),
    encryptedPrivateKeyring: z.string().openapi({ format: "byte" }),
    encryptedSymmetricKeyring: z.string().openapi({ format: "byte" }),
    /**
     * Argon2 salt (base64) from the user’s stored password hash so the SPA can
     * derive the same `passwordValues.key` as the server for `UserPrivateKeyring` /
     * `UserSymmetricKeyring` unwrap. Omitted for `POST /api/sessions/demo`.
     */
    passwordSalt: z
      .string()
      .optional()
      .openapi({ format: "byte", description: "Argon2 salt (base64)." }),
  })
  .openapi("SessionLoginSuccess");

export const sessionRefreshSuccessSchema = z
  .object({
    oldSessionKey: z.string().openapi({ format: "byte" }),
    newSessionKey: z.string().openapi({ format: "byte" }),
  })
  .openapi("SessionRefreshSuccess");

export const serviceUnavailableResponseSchema = z
  .object({
    code: z.literal("SERVICE_UNAVAILABLE"),
    message: z.string(),
  })
  .openapi("ServiceUnavailableResponse");

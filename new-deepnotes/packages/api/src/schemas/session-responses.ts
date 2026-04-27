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

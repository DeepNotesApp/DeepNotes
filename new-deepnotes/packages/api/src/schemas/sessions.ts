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

/**
 * Demo session creation mirrors legacy `sessions.startDemo` input (crypto material + ids).
 * Shape will align with `POST /api/users` once registration is implemented; `additionalProperties` keeps codegen honest until then.
 */
export const sessionDemoRequestSchema = z
  .object({})
  .catchall(z.unknown())
  .openapi("SessionDemoRequest");

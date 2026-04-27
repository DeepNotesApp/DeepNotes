import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

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

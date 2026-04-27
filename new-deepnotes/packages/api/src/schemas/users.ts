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

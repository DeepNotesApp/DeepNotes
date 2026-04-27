import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/** Returned while a route is documented but not yet implemented (Phase 3+). */
export const notImplementedResponseSchema = z
  .object({
    code: z.literal("NOT_IMPLEMENTED"),
    message: z.string(),
  })
  .openapi("NotImplementedResponse");

export type NotImplementedResponse = z.infer<typeof notImplementedResponseSchema>;

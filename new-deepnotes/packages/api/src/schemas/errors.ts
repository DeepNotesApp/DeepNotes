import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/** Reserved shape for documented endpoints that are not yet implemented (prefer implementing or removing the route over relying on this long-term). */
export const notImplementedResponseSchema = z
  .object({
    code: z.literal("NOT_IMPLEMENTED"),
    message: z.string(),
  })
  .openapi("NotImplementedResponse");

export type NotImplementedResponse = z.infer<typeof notImplementedResponseSchema>;

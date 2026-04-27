import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
    service: z.string(),
  })
  .openapi("HealthResponse");

export type HealthResponse = z.infer<typeof healthResponseSchema>;

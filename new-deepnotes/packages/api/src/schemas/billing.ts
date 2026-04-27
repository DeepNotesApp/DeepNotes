import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const stripeCheckoutSessionRequestSchema = z
  .object({
    billingFrequency: z.enum(["monthly", "yearly"]).optional().openapi({
      description: "Defaults to `monthly` when omitted (legacy tRPC).",
    }),
  })
  .openapi("StripeCheckoutSessionRequest");

export const stripeCheckoutSessionResponseSchema = z
  .object({
    checkoutSessionUrl: z.string().url().openapi({ example: "https://checkout.stripe.com/c/pay/..." }),
  })
  .openapi("StripeCheckoutSessionResponse");

export const stripePortalSessionResponseSchema = z
  .object({
    portalSessionUrl: z.string().url().openapi({ example: "https://billing.stripe.com/p/session/..." }),
  })
  .openapi("StripePortalSessionResponse");

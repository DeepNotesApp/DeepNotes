import type { ContentfulStatusCode } from "hono/utils/http-status";
import Stripe from "stripe";
import { stripeCheckoutSessionRequestSchema } from "@deepnotes/api";

import type { ApiHono } from "../api-hono.js";
import { readCookieHeader } from "../cookies.js";
import { getDbForConnectionString } from "../db-pool.js";
import { serviceUnavailableBody } from "../http-helpers.js";
import {
  getSessionEnv,
  getStripeBillingEnv,
  getStripeWebhookSecret,
} from "../session-env.js";

const billingNotConfiguredBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Stripe billing is not configured. Set STRIPE_SECRET_KEY, STRIPE_MONTHLY_PRICE_ID, and STRIPE_YEARLY_PRICE_ID (Wrangler secrets / .dev.vars).",
} as const;

const stripeWebhookNotConfiguredBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Stripe webhooks are not configured (STRIPE_WEBHOOK_SECRET).",
} as const;

export function registerBillingRoutes(app: ApiHono): void {
app.post("/api/billing/stripe/checkout-session", async (c) => {
  const sessionEnv = getSessionEnv(c.env);
  if (sessionEnv == null) {
    return c.json(serviceUnavailableBody, 503);
  }
  const hyper = c.env.HYPERDRIVE;
  if (hyper == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "HYPERDRIVE binding is not configured.",
      },
      503,
    );
  }
  const billing = getStripeBillingEnv(c.env);
  if (billing == null) {
    return c.json(billingNotConfiguredBody, 503);
  }

  let bodyJson: unknown = {};
  try {
    const t = await c.req.text();
    if (t.length > 0) {
      bodyJson = JSON.parse(t) as unknown;
    }
  } catch {
    return c.json({ code: "BAD_REQUEST", message: "Expected JSON object." }, 400);
  }
  const parsed = stripeCheckoutSessionRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.flatten().formErrors.join("; "),
      },
      400,
    );
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performStripeCreateCheckoutSession } = await import(
      "@deepnotes/session"
    );
    const out = await performStripeCreateCheckoutSession({
      db,
      env: sessionEnv,
      billing,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
      requestOrigin: c.req.header("Origin") ?? undefined,
      billingFrequency: parsed.data.billingFrequency,
    });
    return c.json(out, 200);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json(
        { code: e.code, message: e.message },
        e.status as ContentfulStatusCode,
      );
    }
    throw e;
  }
});

app.post("/api/billing/stripe/portal-session", async (c) => {
  const sessionEnv = getSessionEnv(c.env);
  if (sessionEnv == null) {
    return c.json(serviceUnavailableBody, 503);
  }
  const hyper = c.env.HYPERDRIVE;
  if (hyper == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "HYPERDRIVE binding is not configured.",
      },
      503,
    );
  }
  const billing = getStripeBillingEnv(c.env);
  if (billing == null) {
    return c.json(billingNotConfiguredBody, 503);
  }

  const db = getDbForConnectionString(hyper.connectionString);
  const cookieHeader = c.req.header("Cookie");
  try {
    const { performStripeCreatePortalSession } = await import(
      "@deepnotes/session"
    );
    const out = await performStripeCreatePortalSession({
      db,
      env: sessionEnv,
      billing,
      accessCookie: readCookieHeader(cookieHeader, "accessToken"),
    });
    return c.json(out, 200);
  } catch (e) {
    const { SessionError } = await import("@deepnotes/session");
    if (e instanceof SessionError) {
      return c.json(
        { code: e.code, message: e.message },
        e.status as ContentfulStatusCode,
      );
    }
    throw e;
  }
});

app.post("/api/webhooks/stripe", async (c) => {
  const hyper = c.env?.HYPERDRIVE;
  if (hyper == null) {
    return c.json(
      {
        code: "SERVICE_UNAVAILABLE" as const,
        message: "HYPERDRIVE binding is not configured.",
      },
      503,
    );
  }
  const webhookSecret = getStripeWebhookSecret(c.env);
  if (webhookSecret == null) {
    return c.json(stripeWebhookNotConfiguredBody, 503);
  }

  const rawBody = await c.req.text();
  const db = getDbForConnectionString(hyper.connectionString);

  try {
    const {
      parseStripeWebhookEvent,
      processStripeWebhookEvent,
    } = await import("@deepnotes/session");
    const event = parseStripeWebhookEvent({
      rawBody,
      signature: c.req.header("Stripe-Signature") ?? c.req.header("stripe-signature"),
      webhookSecret,
    });
    await processStripeWebhookEvent({ db, event });
    return c.body(null, 200);
  } catch (e) {
    if (e instanceof Stripe.errors.StripeSignatureVerificationError) {
      return c.json(
        { code: "BAD_REQUEST", message: "Invalid Stripe webhook signature." },
        400,
      );
    }
    if (e instanceof Error && e.message === "Missing Stripe-Signature header.") {
      return c.json({ code: "BAD_REQUEST", message: e.message }, 400);
    }
    throw e;
  }
});
}

import type { DeepnotesDb } from "@deepnotes/db/client";
import { users } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { decryptUserEmail } from "@deepnotes/session-core";
import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";

export type StripeBillingEnv = {
  STRIPE_SECRET_KEY: string;
  STRIPE_MONTHLY_PRICE_ID: string;
  STRIPE_YEARLY_PRICE_ID: string;
};

function stripeClient(secret: string): Stripe {
  return new Stripe(secret);
}

function successUrl(
  requestOrigin: string | undefined,
  publicAppUrl: string | undefined,
): string {
  const base =
    requestOrigin != null && requestOrigin.length > 0
      ? requestOrigin.replace(/\/$/, "")
      : (publicAppUrl ?? "https://deepnotes.app").replace(/\/$/, "");
  return `${base}/subscribed#/subscribed`;
}

function subscriptionCustomerId(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string"
    ? sub.customer
    : sub.customer.id;
}

/**
 * @returns user id, or `undefined` if no `users` row has this Stripe customer id.
 */
export async function findUserIdByStripeCustomerId(
  db: DeepnotesDb,
  customerId: string,
): Promise<string | undefined> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.customerId, customerId))
    .limit(1);
  return row?.id;
}

/**
 * `users.account.stripe.createCheckoutSession` (legacy tRPC) — no KeyDB: customer id
 * and email live on `users` + `decryptUserEmail`.
 */
export async function performStripeCreateCheckoutSession(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  billing: StripeBillingEnv;
  accessCookie: string | undefined;
  requestOrigin: string | undefined;
  /** Defaults to monthly when omitted (legacy). */
  billingFrequency?: "monthly" | "yearly";
}): Promise<{ checkoutSessionUrl: string }> {
  const { userId, demo, emailVerified } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  if (demo) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "This action is not available for demo accounts.",
    );
  }
  if (!emailVerified) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Verify your email before subscribing.",
    );
  }

  const stripe = stripeClient(input.billing.STRIPE_SECRET_KEY);
  const emailExceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";

  const [userRow] = await input.db
    .select({
      customerId: users.customerId,
      encryptedEmail: users.encryptedEmail,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userRow == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const email = decryptUserEmail(
    new Uint8Array(userRow.encryptedEmail),
    input.env.USER_EMAIL_ENCRYPTION_KEY,
    emailExceptions,
  );

  let customer: Stripe.Customer | null = null;

  if (userRow.customerId != null && userRow.customerId.length > 0) {
    try {
      const retrieved = await stripe.customers.retrieve(userRow.customerId, {
        expand: ["subscriptions"],
      });
      if (!retrieved.deleted) {
        customer = retrieved;
      }
    } catch {
      customer = null;
    }
  }

  if (customer == null) {
    const byEmail = await stripe.customers.list({
      email,
      limit: 1,
      expand: ["data.subscriptions"],
    });
    const found = byEmail.data[0];
    customer = found ?? (await stripe.customers.create({ email }));

    await input.db
      .update(users)
      .set({ customerId: customer.id })
      .where(eq(users.id, userId));
  }

  if (customer.subscriptions?.data[0] != null) {
    await input.db
      .update(users)
      .set({
        plan: "pro",
        subscriptionId: customer.subscriptions.data[0].id,
      })
      .where(eq(users.id, userId));
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "You already have an active subscription.",
    );
  }

  const priceId =
    input.billingFrequency === "yearly"
      ? input.billing.STRIPE_YEARLY_PRICE_ID
      : input.billing.STRIPE_MONTHLY_PRICE_ID;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customer.id,
    success_url: successUrl(input.requestOrigin, input.env.PUBLIC_APP_URL),
  });

  if (session.url == null) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Failed to create checkout session.",
    );
  }
  return { checkoutSessionUrl: session.url };
}

/** `users.account.stripe.createPortalSession` */
export async function performStripeCreatePortalSession(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  billing: StripeBillingEnv;
  accessCookie: string | undefined;
}): Promise<{ portalSessionUrl: string }> {
  const { userId, demo } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  if (demo) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "This action is not available for demo accounts.",
    );
  }

  const [row] = await input.db
    .select({ customerId: users.customerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }
  if (row.customerId == null || row.customerId === "") {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "No Stripe customer on file. Start checkout first.",
    );
  }

  const stripe = stripeClient(input.billing.STRIPE_SECRET_KEY);
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: row.customerId,
  });
  if (portalSession.url == null) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Failed to create customer portal session.",
    );
  }
  return { portalSessionUrl: portalSession.url };
}

/**
 * Applies legacy `stripe-webhook` behavior: `customer.subscription.updated` and
 * `customer.subscription.deleted` using `users.customer_id` (no KeyDB `customer` hash).
 */
export async function processStripeWebhookEvent(input: {
  db: DeepnotesDb;
  event: Stripe.Event;
}): Promise<void> {
  switch (input.event.type) {
    case "customer.subscription.updated":
      await onCustomerSubscriptionUpdated(input.db, input.event);
      return;
    case "customer.subscription.deleted":
      await onCustomerSubscriptionDeleted(input.db, input.event);
      return;
    default:
      return;
  }
}

function prevAttrs(
  event: Stripe.Event,
): Record<string, unknown> | null | undefined {
  const data = event.data as {
    previous_attributes?: Record<string, unknown> | null;
  };
  return data.previous_attributes;
}

async function onCustomerSubscriptionUpdated(
  db: DeepnotesDb,
  event: Stripe.Event,
): Promise<void> {
  const previousAttributes = prevAttrs(event);
  if (previousAttributes != null && "cancel_at" in previousAttributes) {
    return;
  }

  const subscription = event.data.object as Stripe.Subscription;

  if (
    previousAttributes != null &&
    "status" in previousAttributes &&
    subscription.status === "active"
  ) {
    const customerId = subscriptionCustomerId(subscription);
    const userId = await findUserIdByStripeCustomerId(db, customerId);
    if (userId == null) {
      return;
    }
    await db
      .update(users)
      .set({ plan: "pro", subscriptionId: subscription.id })
      .where(eq(users.id, userId));
  }
}

async function onCustomerSubscriptionDeleted(
  db: DeepnotesDb,
  event: Stripe.Event,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  if (subscription.status !== "canceled") {
    return;
  }
  const customerId = subscriptionCustomerId(subscription);
  const userId = await findUserIdByStripeCustomerId(db, customerId);
  if (userId == null) {
    return;
  }
  await db
    .update(users)
    .set({ plan: "basic", subscriptionId: null })
    .where(eq(users.id, userId));
}

export function parseStripeWebhookEvent(input: {
  rawBody: string;
  signature: string | undefined;
  webhookSecret: string;
}): Stripe.Event {
  if (input.signature == null || input.signature === "") {
    throw new Error("Missing Stripe-Signature header.");
  }
  return Stripe.webhooks.constructEvent(
    input.rawBody,
    input.signature,
    input.webhookSecret,
  );
}

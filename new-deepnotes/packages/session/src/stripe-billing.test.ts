import { describe, expect, it } from "vitest";
import Stripe from "stripe";

import type { DeepnotesDb } from "@deepnotes/db/client";

import {
  parseStripeWebhookEvent,
  processStripeWebhookEvent,
} from "@deepnotes/billing";

/** Test-only webhook secret (`whsec_…` shape not required for `constructEvent`). */
const WEBHOOK_SECRET = "whsec_unit_test_secret_not_real";

function signedPayload(rawBody: string): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: WEBHOOK_SECRET,
  });
}

/** Minimal Drizzle-shaped mock: `findUserIdByStripeCustomerId` always resolves one row. */
function createCustomerDb(userId: string): {
  db: DeepnotesDb;
  updates: Array<{ plan?: string; subscriptionId?: string | null }>;
} {
  const updates: Array<{ plan?: string; subscriptionId?: string | null }> = [];
  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  return [{ id: userId }];
                },
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set(fields: { plan?: string; subscriptionId?: string | null }) {
          updates.push(fields);
          return {
            where() {
              return Promise.resolve(undefined);
            },
          };
        },
      };
    },
  };
  return { db: db as unknown as DeepnotesDb, updates };
}

describe("parseStripeWebhookEvent", () => {
  it("throws when Stripe-Signature is missing", () => {
    expect(() =>
      parseStripeWebhookEvent({
        rawBody: "{}",
        signature: undefined,
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toThrow("Missing Stripe-Signature header.");
  });

  it("throws when signature does not match secret", () => {
    const rawBody = '{"id":"evt_test"}';
    const header = signedPayload(rawBody);
    expect(() =>
      parseStripeWebhookEvent({
        rawBody,
        signature: header,
        webhookSecret: "whsec_wrong_secret________________",
      }),
    ).toThrow(Stripe.errors.StripeSignatureVerificationError);
  });

  it("parses a signed payload", () => {
    const rawBody = JSON.stringify({
      id: "evt_test_parse",
      object: "event",
      api_version: "2024-11-20.acacia",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test",
          object: "subscription",
          customer: "cus_test",
          status: "active",
        },
      },
    });
    const event = parseStripeWebhookEvent({
      rawBody,
      signature: signedPayload(rawBody),
      webhookSecret: WEBHOOK_SECRET,
    });
    expect(event.type).toBe("customer.subscription.updated");
    expect(event.id).toBe("evt_test_parse");
  });
});

describe("processStripeWebhookEvent", () => {
  it("no-ops for unrelated event types without touching db", async () => {
    const trap = new Proxy(
      {},
      {
        get() {
          throw new Error("db should not be accessed");
        },
      },
    );
    await processStripeWebhookEvent({
      db: trap as DeepnotesDb,
      event: {
        type: "customer.created",
        data: { object: {} },
      } as Stripe.Event,
    });
  });

  it("subscription.updated: ignores cancel_at churn on previous_attributes", async () => {
    const { db, updates } = createCustomerDb("user-1");
    await processStripeWebhookEvent({
      db,
      event: {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            object: "subscription",
            customer: "cus_x",
            status: "active",
          } as Stripe.Subscription,
          previous_attributes: { cancel_at: 12345 },
        },
      } as Stripe.Event,
    });
    expect(updates).toHaveLength(0);
  });

  it("subscription.updated: sets pro when status transitions to active", async () => {
    const { db, updates } = createCustomerDb("user-1");
    await processStripeWebhookEvent({
      db,
      event: {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_active",
            object: "subscription",
            customer: "cus_x",
            status: "active",
          } as Stripe.Subscription,
          previous_attributes: { status: "incomplete" },
        },
      } as Stripe.Event,
    });
    expect(updates).toEqual([
      { plan: "pro", subscriptionId: "sub_active" },
    ]);
  });

  it("subscription.deleted: sets basic when status is canceled", async () => {
    const { db, updates } = createCustomerDb("user-2");
    await processStripeWebhookEvent({
      db,
      event: {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_del",
            object: "subscription",
            customer: "cus_y",
            status: "canceled",
          } as Stripe.Subscription,
        },
      } as Stripe.Event,
    });
    expect(updates).toEqual([{ plan: "basic", subscriptionId: null }]);
  });

  it("subscription.deleted: no-op when stripe object is not canceled", async () => {
    const { db, updates } = createCustomerDb("user-3");
    await processStripeWebhookEvent({
      db,
      event: {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_x",
            object: "subscription",
            customer: "cus_z",
            status: "active",
          } as Stripe.Subscription,
        },
      } as Stripe.Event,
    });
    expect(updates).toHaveLength(0);
  });
});

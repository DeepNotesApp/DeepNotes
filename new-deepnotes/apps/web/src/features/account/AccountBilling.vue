<script setup lang="ts">
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { components } from "../../api/api-types.generated";
import { useSession } from "../auth/useSession";

const { client, user, loading } = useSession();

const stripeBusy = ref(false);
const stripeError = ref<string | null>(null);

async function stripeCheckout(
  freq: NonNullable<
    components["schemas"]["StripeCheckoutSessionRequest"]["billingFrequency"]
  >,
) {
  stripeError.value = null;
  stripeBusy.value = true;
  try {
    const res = await client.POST("/api/billing/stripe/checkout-session", {
      body: { billingFrequency: freq },
    });
    if (res.response.status !== 200 || !res.data?.checkoutSessionUrl) {
      stripeError.value =
        messageFromMaybeError(res.error) ?? "Checkout could not be started.";
      return;
    }
    window.location.assign(res.data.checkoutSessionUrl);
  } finally {
    stripeBusy.value = false;
  }
}

async function stripePortal() {
  stripeError.value = null;
  stripeBusy.value = true;
  try {
    const res = await client.POST("/api/billing/stripe/portal-session", {});
    if (res.response.status !== 200 || !res.data?.portalSessionUrl) {
      stripeError.value =
        messageFromMaybeError(res.error) ?? "Customer portal could not be opened.";
      return;
    }
    window.location.assign(res.data.portalSessionUrl);
  } finally {
    stripeBusy.value = false;
  }
}

function messageFromMaybeError(e: unknown): string | undefined {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") {
      return m;
    }
  }
  return undefined;
}
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Subscription</CardTitle>
        <CardDescription>
          Manage your DeepNotes plan and billing through Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button
          :disabled="stripeBusy || !user?.emailVerified || loading"
          size="sm"
          variant="secondary"
          @click="stripeCheckout('monthly')"
        >
          Upgrade (monthly)
        </Button>
        <Button
          :disabled="stripeBusy || !user?.emailVerified || loading"
          size="sm"
          variant="secondary"
          @click="stripeCheckout('yearly')"
        >
          Upgrade (yearly)
        </Button>
        <Button
          :disabled="stripeBusy || loading"
          size="sm"
          variant="outline"
          @click="stripePortal"
        >
          Customer portal
        </Button>
      </CardContent>
      <CardFooter class="flex flex-col gap-2 border-t pt-4">
        <p v-if="user && !user?.emailVerified" class="text-muted-foreground text-xs">
          Verify your email first to start checkout.
        </p>
        <p v-if="stripeError" class="text-destructive text-sm">
          {{ stripeError }}
        </p>
      </CardFooter>
    </Card>
  </div>
</template>

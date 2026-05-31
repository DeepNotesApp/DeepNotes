<script setup lang="ts">
import { ref, computed } from "vue";
import { useHead } from "@unhead/vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
useHead({
  title: "Pricing — DeepNotes",
  meta: [
    {
      name: "description",
      content: "DeepNotes pricing plans. Free for personal use. Pro for teams.",
    },
  ],
});

const billingFrequency = ref<"monthly" | "yearly">("monthly");

const appHref = computed(() => import.meta.env.VITE_WEB_APP_URL?.trim() || "/");

const plans = [
  {
    name: "Basic",
    description: "For personal use",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Create up to 50 pages",
      "End-to-end encryption",
      "Spatial note-taking",
      "Graph-based navigation",
      "Collaborate between devices",
      "Two-factor authentication",
    ],
    cta: "Get started",
    href: computed(() => appHref.value),
    variant: "outline" as const,
  },
  {
    name: "Pro",
    description: "For teams and power users",
    monthlyPrice: 4.99,
    yearlyPrice: 3.99,
    features: [
      "Unlimited pages",
      "Collaborative groups",
      "Private and public groups",
      "Password protected groups",
      "Manage user roles",
      "14-day page history",
    ],
    cta: "Choose Pro",
    href: computed(() => appHref.value),
    variant: "default" as const,
    highlight: true,
  },
];

function formatPrice(price: number) {
  return price === 0 ? "Free" : `$${price.toFixed(2)}`;
}

function priceLabel(plan: (typeof plans)[number]) {
  const price =
    billingFrequency.value === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}`;
}

function periodLabel() {
  return billingFrequency.value === "monthly" ? "/month" : "/month, billed annually";
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
    <div class="text-center">
      <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
        Pricing Plans
      </h1>
      <p class="mt-4 text-muted-foreground">
        Simple pricing. No hidden fees.
      </p>
    </div>

    <!-- Billing toggle -->
    <div class="mt-10 flex items-center justify-center gap-3">
      <span
        :class="[
          'text-sm font-medium',
          billingFrequency === 'monthly'
            ? 'text-foreground'
            : 'text-muted-foreground',
        ]"
        >Monthly</span
      >
      <button
        type="button"
        role="switch"
        :aria-checked="billingFrequency === 'yearly'"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        :class="{ 'bg-primary': billingFrequency === 'yearly' }"
        @click="billingFrequency = billingFrequency === 'yearly' ? 'monthly' : 'yearly'"
      >
        <span
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out"
          :class="{ 'translate-x-5': billingFrequency === 'yearly', 'translate-x-0': billingFrequency === 'monthly' }"
        />
      </button>
      <span
        :class="[
          'text-sm font-medium',
          billingFrequency === 'yearly'
            ? 'text-foreground'
            : 'text-muted-foreground',
        ]"
        >Yearly</span
      >
      <span
        v-if="billingFrequency === 'yearly'"
        class="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
        >Save 20%</span
      >
    </div>

    <!-- Plan cards -->
    <div class="mt-12 grid gap-6 md:grid-cols-2">
      <Card
        v-for="plan in plans"
        :key="plan.name"
        :class="[
          'flex flex-col border-border/60',
          plan.highlight ? 'border-primary ring-1 ring-primary' : '',
        ]"
      >
        <CardHeader class="space-y-2">
          <CardTitle class="text-2xl">{{ plan.name }}</CardTitle>
          <CardDescription>{{ plan.description }}</CardDescription>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-4xl font-bold">{{ priceLabel(plan) }}</span>
            <span
              v-if="priceLabel(plan) !== 'Free'"
              class="text-sm text-muted-foreground"
              >{{ periodLabel() }}</span
            >
          </div>
        </CardHeader>
        <CardContent class="flex-1">
          <ul class="space-y-3">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="flex items-start gap-2 text-sm"
            >
              <svg
                class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{{ feature }}</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            as="a"
            :href="plan.href.value"
            :variant="plan.variant"
            class="w-full"
          >
            {{ plan.cta }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

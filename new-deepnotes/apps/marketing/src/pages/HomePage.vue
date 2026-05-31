<script setup lang="ts">
import { computed } from "vue";
import { useHead } from "@unhead/vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const appHref = computed(() => import.meta.env.VITE_WEB_APP_URL?.trim() || "/");

useHead({
  title: "DeepNotes — End-to-end encrypted notes",
  meta: [
    {
      name: "description",
      content:
        "DeepNotes is an open source, end-to-end encrypted infinite canvas tool with deep nesting and real-time collaboration.",
    },
  ],
});

const features = [
  {
    title: "Spatial canvas",
    description:
      "Floating notes on an infinite canvas. Create many separate walls of text in the same page. Move, expand, colorize. Use containers to create nested notes.",
  },
  {
    title: "Real-time collaboration",
    description:
      "Collaborate with your team or work simultaneously from multiple devices. Password-protect your groups for an extra level of protection.",
  },
  {
    title: "End-to-end encryption",
    description:
      "Your content is encrypted before it leaves your device. The server stores ciphertext only. Only you hold the keys.",
  },
];

const useCases = [
  { title: "Mind maps", emoji: "🧠" },
  { title: "Diagrams", emoji: "📐" },
  { title: "Kanban boards", emoji: "📋" },
  { title: "Database diagrams", emoji: "🗄️" },
  { title: "Family trees", emoji: "🌳" },
  { title: "Flashcards", emoji: "🎴" },
  { title: "Cheat sheets", emoji: "📄" },
  { title: "Studies", emoji: "📚" },
];
</script>

<template>
  <div>
    <!-- Hero -->
    <section
      class="mx-auto flex max-w-5xl flex-col items-center px-4 pt-20 pb-16 text-center md:px-6 md:pt-28 md:pb-24"
    >
      <h1
        class="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
      >
        Dive into your<br />note universe
      </h1>
      <p class="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
        An open source,
        <span
          class="rounded bg-primary px-1.5 py-0.5 text-xs font-bold uppercase text-primary-foreground"
          >end-to-end encrypted</span
        >
        infinite canvas tool with deep nesting and real-time collaboration.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button as="a" :href="appHref" size="lg"> Get started for free </Button>
        <Button as="a" :href="appHref" variant="outline" size="lg">
          Open app
        </Button>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
      <div class="grid gap-6 md:grid-cols-3">
        <Card
          v-for="feature in features"
          :key="feature.title"
          class="border-border/60"
        >
          <CardHeader class="space-y-2">
            <CardTitle class="text-xl">{{ feature.title }}</CardTitle>
            <CardDescription class="text-base leading-relaxed">
              {{ feature.description }}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>

    <!-- Use cases -->
    <section class="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
      <h2 class="text-center text-3xl font-bold tracking-tight md:text-4xl">
        Use cases
      </h2>
      <div class="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card
          v-for="useCase in useCases"
          :key="useCase.title"
          class="flex flex-col items-center justify-center border-border/60 py-8 text-center"
        >
          <CardContent class="pb-0">
            <span class="text-4xl">{{ useCase.emoji }}</span>
            <p class="mt-3 font-medium">{{ useCase.title }}</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section
      class="mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center md:px-6 md:py-24"
    >
      <h2 class="text-3xl font-bold tracking-tight md:text-4xl">
        Ready to dive in?
      </h2>
      <p class="mt-4 max-w-lg text-muted-foreground">
        Start organizing your thoughts on an infinite canvas, encrypted end to
        end.
      </p>
      <Button as="a" :href="appHref" size="lg" class="mt-8">
        Get started — It&apos;s free!
      </Button>
    </section>
  </div>
</template>

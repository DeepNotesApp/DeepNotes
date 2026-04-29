<template>
  <div class="min-h-screen bg-background text-foreground">
    <div
      class="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10 md:px-8"
    >
      <header class="mb-10 flex items-center justify-between gap-4">
        <span class="text-lg font-semibold tracking-tight">DeepNotes</span>
        <Button as="a" :href="appHref">Open app</Button>
      </header>

      <Card class="border-border/60 shadow-none">
        <CardHeader class="space-y-3 pb-2">
          <CardTitle class="text-2xl tracking-tight sm:text-3xl">
            Notes that stay yours
          </CardTitle>
          <CardDescription class="text-base leading-relaxed">
            DeepNotes is built for end-to-end encrypted notes and collaboration. Your content is
            encrypted before it leaves your device; the server stores ciphertext only.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-muted-foreground">
          <p class="leading-relaxed">
            This marketing site is static HTML from
            <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">vite-ssg</code>;
            the signed-in experience is a separate SPA (see
            <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">apps/web</code>
            in the repo).
          </p>
        </CardContent>
        <CardFooter class="flex-col items-start gap-1 pt-4">
          <p class="text-muted-foreground text-xs leading-relaxed">
            Licensed under AGPL-3.0. Source code obligations apply when you modify and distribute the
            software.
          </p>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
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

const appHref = computed(() => import.meta.env.VITE_WEB_APP_URL?.trim() || "/");

useHead({
  title: "DeepNotes — encrypted notes",
  meta: [
    {
      name: "description",
      content:
        "End-to-end encrypted notes and collaboration. Static marketing shell; app runs as a separate SPA.",
    },
  ],
});
</script>

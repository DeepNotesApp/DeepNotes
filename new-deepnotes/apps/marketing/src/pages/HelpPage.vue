<script setup lang="ts">
import { ref, computed } from "vue";
import { useHead } from "@unhead/vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

useHead({
  title: "Help — DeepNotes",
  meta: [
    {
      name: "description",
      content: "Help center for DeepNotes. Getting started, creating notes, sharing pages, and more.",
    },
  ],
});

const searchQuery = ref("");

const articles = [
  {
    slug: "what-is-deepnotes",
    title: "What is DeepNotes? Also, why?",
    excerpt:
      "DeepNotes is a note-taking tool built to bring more simplicity, freedom, and privacy to the note-taking game.",
  },
  {
    slug: "getting-started",
    title: "Getting started",
    excerpt:
      "Learn how to create your first page, add notes, and navigate the infinite canvas.",
  },
  {
    slug: "creating-notes",
    title: "Creating notes and arrows",
    excerpt:
      "Double-click to create a note. Drag to connect arrows. Use containers for nested structures.",
  },
  {
    slug: "sharing-pages",
    title: "Sharing pages",
    excerpt:
      "Invite users to your group, create public groups, and collaborate in real time.",
  },
  {
    slug: "billing-subscriptions",
    title: "Billing & subscriptions",
    excerpt:
      "How DeepNotes billing works, upgrading to Pro, and managing your subscription.",
  },
  {
    slug: "forgot-password",
    title: "I've forgotten my password. What can I do?",
    excerpt:
      "DeepNotes uses end-to-end encryption. If you forget your password, your data cannot be recovered.",
  },
  {
    slug: "offline-usage",
    title: "Can I use DeepNotes while offline?",
    excerpt:
      "DeepNotes requires an internet connection to sync and collaborate. Offline support is on the roadmap.",
  },
  {
    slug: "multi-page-search",
    title: "Can I search text across multiple pages?",
    excerpt:
      "Multi-page text search is available on the Pro plan. Learn how to use it effectively.",
  },
];

const filteredArticles = computed(() => {
  if (!searchQuery.value.trim()) return articles;
  const q = searchQuery.value.toLowerCase();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
  );
});
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
    <h1 class="text-center text-4xl font-bold tracking-tight md:text-5xl">
      Help
    </h1>

    <!-- Search -->
    <div class="mt-10">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search articles..."
        class="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <!-- Articles -->
    <div class="mt-8 grid gap-4">
      <RouterLink
        v-for="article in filteredArticles"
        :key="article.slug"
        :to="`/help/${article.slug}`"
        class="block transition-colors"
      >
        <Card class="border-border/60 hover:border-primary/60 hover:bg-muted/30">
          <CardHeader class="pb-2">
            <CardTitle class="text-lg">{{ article.title }}</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">{{ article.excerpt }}</p>
          </CardContent>
        </Card>
      </RouterLink>
    </div>

    <p v-if="filteredArticles.length === 0" class="mt-8 text-center text-muted-foreground">
      No articles found matching &quot;{{ searchQuery }}&quot;.
    </p>

    <div class="mt-12 text-center text-sm text-muted-foreground">
      Have other questions? Feel free to reach out on our socials.
      We are most active on
      <a
        href="https://discord.gg/UaF2gPTUPh"
        target="_blank"
        class="font-medium text-foreground underline underline-offset-2"
        >Discord</a
      >.
    </div>
  </div>
</template>

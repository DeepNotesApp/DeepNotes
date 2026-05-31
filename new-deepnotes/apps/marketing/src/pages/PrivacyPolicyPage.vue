<script setup lang="ts">
import { computed } from "vue";
import { useHead } from "@unhead/vue";
import { marked } from "marked";

useHead({
  title: "Privacy Policy — DeepNotes",
  meta: [
    {
      name: "description",
      content: "DeepNotes privacy policy.",
    },
  ],
});

const markdownSource = `
## Data collection

We collect four types of information from our users: email, end-to-end encrypted data, metadata, and usage data.
Your email is used for identification and communication purposes.
End-to-end encrypted data refers to the data you store in DeepNotes, such as notes and arrows.
Metadata refers to information about your data, such as creation date.
Usage data helps us measure and improve the app.

## Data protection

DeepNotes uses end-to-end encryption to protect your information.
Only you have the key to your information, making it inaccessible to anyone else, including DeepNotes.

Your email is the only piece of information, along with metadata, that is not end-to-end encrypted.
This is because we need to know your email in order to identify and communicate with you.
In order to keep your email as protected as possible, we keep your email pepper-encrypted in our database.

For more details on how we protect your data, please refer to our [security whitepaper](/whitepaper).

## Data storage

DeepNotes stores all of its data in the United States.
While already being end-to-end encrypted, the data is also encrypted at rest.

## Data processing

DeepNotes shares your email with [Stripe](https://stripe.com/) for payment processing.
We also process usage data in order to helps us understand how people use DeepNotes and how to make the app better.
Usage data is anonymous and can't be linked back to you.

## Cookies

We use [Stripe](https://stripe.com/) for payment processing.
Stripe introduces some cookies in order to fulfill their task.
Apart from those cookies, DeepNotes only uses cookies for user authentication and session management.

## User rights

You can delete your groups and pages at any time.

You also have the option to delete your DeepNotes account at any time. When you delete your account, all your data will be permanently deleted from our database.

## Contact

If you have any questions or concerns about your privacy while using DeepNotes, please feel free to reach out to us at contact@deepnotes.app.
We are always here to help and will get back to you as soon as we can.
`;

const html = computed(() => marked.parse(markdownSource));

const headings = computed(() => {
  const result: { text: string; id: string }[] = [];
  const tokens = marked.lexer(markdownSource);
  for (const token of tokens) {
    if (token.type === "heading") {
      const id = token.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      result.push({ text: token.text, id });
    }
  }
  return result;
});
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:px-6 md:py-24">
    <!-- Sticky sidebar -->
    <aside class="hidden md:block md:w-64 md:shrink-0">
      <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <nav class="flex flex-col gap-1">
          <a
            v-for="heading in headings"
            :key="heading.id"
            :href="'#' + heading.id"
            class="rounded-md px-3 py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {{ heading.text }}
          </a>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <article class="min-w-0 flex-1">
      <h1 class="mb-10 text-center text-4xl font-bold tracking-tight md:text-5xl">
        Privacy Policy
      </h1>
      <div
        class="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
        v-html="html"
      />
    </article>
  </div>
</template>

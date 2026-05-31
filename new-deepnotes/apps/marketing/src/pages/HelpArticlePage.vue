<script setup lang="ts">
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useHead } from "@unhead/vue";

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const articles: Record<
  string,
  { title: string; content: string }
> = {
  "what-is-deepnotes": {
    title: "What is DeepNotes? Also, why?",
    content: `
<p>DeepNotes is a note-taking tool being developed since 2022 to bring more <b>simplicity</b>, <b>freedom</b>, and <b>privacy</b> to the note-taking game.</p>

<p>It was born out of the frustration with popular note-taking tools.</p>

<p>These are some of the bad things they do and how DeepNotes solves them:</p>
<ol>
  <li><b>Most note-taking apps lock you in a single wall of text:</b> DeepNotes solves this by using floating notes in infinite canvases. This lets you create many separate walls of text in the same page.</li>
  <li><b>Many lock you in a tree-like page hierarchy, which gets harder to maintain over time:</b> DeepNotes uses a detached page system, that is, it doesn't lock you into any page hierarchy. You create your own page navigation structure by linking your pages with each other.</li>
  <li><b>They add numerous complex features that clutter the app and feel out of place:</b> DeepNotes focuses on the core note-taking experience. It's just notes and arrows inside pages. That's it.</li>
  <li><b>They don't care about the privacy of your data:</b> DeepNotes uses end-to-end encryption to keep your notes extremely well protected. Only you have access to your data.</li>
</ol>

<p>DeepNotes is being developed by <a href="https://gustavotoyota.dev" target="_blank">Gustavo Toyota</a>, a Brazilian software developer passionate for learning and concept visualization.</p>
`,
  },
  "getting-started": {
    title: "Getting started",
    content: `
<p>Welcome to DeepNotes! Here's how to get started in a few simple steps:</p>
<ol>
  <li><b>Create an account</b> — Sign up with your email and a strong password. Your master key is derived from your password, so make it memorable and secure.</li>
  <li><b>Create your first page</b> — After logging in, click "New page" to create an infinite canvas.</li>
  <li><b>Add notes</b> — Double-click anywhere on the canvas to create a note. Type your content directly.</li>
  <li><b>Move and resize</b> — Drag notes to reposition them. Drag edges to resize.</li>
  <li><b>Create arrows</b> — Drag from a note's anchor point to another note to create an arrow.</li>
  <li><b>Navigate</b> — Pan the canvas by dragging empty space. Zoom with the mouse wheel or pinch.</li>
</ol>
<p>That's it! You're ready to start organizing your thoughts spatially.</p>
`,
  },
  "creating-notes": {
    title: "Creating notes and arrows",
    content: `
<p>DeepNotes is built around two core primitives: <b>notes</b> and <b>arrows</b>.</p>

<h3>Creating notes</h3>
<ul>
  <li><b>Double-click</b> on empty canvas space to create a new note.</li>
  <li><b>Type</b> directly into the note to add content.</li>
  <li><b>Drag</b> the note header to move it around.</li>
  <li><b>Drag edges</b> to resize notes.</li>
  <li><b>Right-click</b> a note to change its color, shape, or delete it.</li>
</ul>

<h3>Creating arrows</h3>
<ul>
  <li>Hover over a note to reveal its <b>anchor points</b>.</li>
  <li><b>Drag</b> from an anchor point to another note to create an arrow.</li>
  <li>Arrows automatically stay connected when you move notes.</li>
  <li>Right-click an arrow to change its style or delete it.</li>
</ul>

<h3>Containers</h3>
<p>Use containers to group related notes together. Containers can be nested, creating deep hierarchies of content.</p>
`,
  },
  "sharing-pages": {
    title: "Sharing pages",
    content: `
<p>DeepNotes makes collaboration easy while keeping your data encrypted.</p>

<h3>Groups</h3>
<p>Pages live inside <b>groups</b>. To share a page, you share access to its group.</p>

<h3>Inviting users</h3>
<ol>
  <li>Open the group sidebar.</li>
  <li>Click "Invite user".</li>
  <li>Enter the email of the person you want to invite.</li>
  <li>Choose their role (admin, editor, or viewer).</li>
  <li>Send the invitation.</li>
</ol>

<h3>Public groups</h3>
<p>You can make a group public so anyone with a link can view its pages. Public groups are still encrypted in transit and at rest, but the group key is shared publicly.</p>

<h3>Password-protected groups</h3>
<p>For extra security, you can password-protect a private group. Members must enter the password to access its content.</p>
`,
  },
  "billing-subscriptions": {
    title: "Billing & subscriptions",
    content: `
<p>DeepNotes offers two plans: <b>Basic</b> (free) and <b>Pro</b> (paid).</p>

<h3>Basic plan</h3>
<p>The Basic plan is free and includes:</p>
<ul>
  <li>Up to 50 pages</li>
  <li>End-to-end encryption</li>
  <li>Spatial note-taking</li>
  <li>Graph-based navigation</li>
  <li>Collaborate between your own devices</li>
  <li>Two-factor authentication</li>
</ul>

<h3>Pro plan</h3>
<p>The Pro plan unlocks:</p>
<ul>
  <li>Unlimited pages</li>
  <li>Collaborative groups (invite other users)</li>
  <li>Private and public groups</li>
  <li>Password-protected groups</li>
  <li>Manage user roles</li>
  <li>14-day page history</li>
</ul>

<h3>Upgrading</h3>
<p>You can upgrade to Pro from the Pricing page or from your account settings. We use Stripe for secure payment processing.</p>

<h3>Cancellation</h3>
<p>You can cancel your subscription at any time from your account settings. You will retain Pro features until the end of your billing period.</p>
`,
  },
  "forgot-password": {
    title: "I've forgotten my password. What can I do?",
    content: `
<p>DeepNotes uses <b>end-to-end encryption</b>. This means your data is encrypted with keys derived from your password, and the server never sees your plaintext content.</p>

<p><b>Because of this, if you forget your password, your data cannot be recovered.</b></p>

<p>However, you can reset your password if you still have access to an active session on one of your devices:</p>
<ol>
  <li>Log in to DeepNotes from a device where you are still signed in.</li>
  <li>Go to Account settings.</li>
  <li>Choose "Change password".</li>
  <li>Follow the steps to set a new password.</li>
</ol>

<p>If you are locked out of all devices, there is unfortunately no way to recover your account or data. We recommend using a password manager to keep your DeepNotes password safe.</p>
`,
  },
  "offline-usage": {
    title: "Can I use DeepNotes while offline?",
    content: `
<p>Currently, DeepNotes requires an active internet connection to sync your changes with the server and to enable real-time collaboration.</p>

<p>Offline support is on our roadmap. When implemented, you will be able to:</p>
<ul>
  <li>Create and edit notes without a connection.</li>
  <li>Queue changes locally.</li>
  <li>Automatically sync when you come back online.</li>
</ul>

<p>Follow our <a href="https://discord.gg/UaF2gPTUPh" target="_blank">Discord</a> for updates on offline support.</p>
`,
  },
  "multi-page-search": {
    title: "Can I search text across multiple pages?",
    content: `
<p>Multi-page text search is available on the <b>Pro</b> plan.</p>

<p>To search across multiple pages:</p>
<ol>
  <li>Open the search panel (Ctrl+K or Cmd+K).</li>
  <li>Type your search query.</li>
  <li>Results are grouped by page and note.</li>
  <li>Click a result to navigate directly to that note.</li>
</ol>

<p>Search indexes are built client-side from decrypted content, so your search queries never leave your device.</p>
`,
  },
  "creating-group": {
    title: "How to create a group?",
    content: `
<p>You can create private and public groups if you are <b>subscribed to the Pro plan</b>.</p>

<p>In order to create a group you have to:</p>
<ol>
  <li><b>Open the New page dialog</b> by clicking on <b>Create new page</b> or <b>Create with options</b> on the expanded right sidebar.</li>
  <li>Select <b>(New group)</b> as the target group of the new page.</li>
  <li>Fill the group creation fields and click Ok.</li>
</ol>
`,
  },
  "inviting-users": {
    title: "How to invite users to a group?",
    content: `
<ol>
  <li>Go to a page of the group you want to add members to. Make sure there is nothing selected on the page.</li>
  <li>On the right sidebar, click on <b>Group settings</b>.</li>
  <li>Go to the <b>Join invitations</b> tab and click on <b>Invite new member</b>.</li>
  <li>Fill the form fields and click <b>Ok</b> to invite the user.</li>
  <li>Now the user decides if they want to <b>accept</b> or <b>reject</b> the invitation.</li>
</ol>
`,
  },
  "joining-group": {
    title: "How to join a group?",
    content: `
<p>To send a request to join a group, a user has to:</p>
<ol>
  <li>Go to a page of the group they want to join and click on <b>Request access</b>.</li>
  <li>Choose a name to use within the group and click <b>Ok</b>.</li>
  <li>Now wait for the admins to <b>accept</b> or <b>reject</b> the request.</li>
</ol>
`,
  },
  "roadmap": {
    title: "Is there a roadmap?",
    content: `
<p>Yes, it is available at:</p>
<p><a href="https://deepnotes.app/pages/voEG2WDb5e2x1Ep6hjwVp" target="_blank">https://deepnotes.app/pages/voEG2WDb5e2x1Ep6hjwVp</a></p>
`,
  },
  "refund-policy": {
    title: "What is the refund policy on DeepNotes?",
    content: `
<p>We offer a <b>100% refund</b> within 7 days of your purchase. No questions asked.</p>

<p>If you are not satisfied with DeepNotes, please reach out at <a href="mailto:contact@deepnotes.app?subject=Refund Request">contact@deepnotes.app</a>.</p>
`,
  },
  "subscription-expiration": {
    title: "What happens when my subscription expires?",
    content: `
<p>When your subscription expires, all pages created during your subscription becomes read-only. You will not be able to edit them, but you will still be able to view them.</p>
`,
  },
};

const article = computed(() => articles[slug.value]);

useHead(() => ({
  title: article.value
    ? `${article.value.title} — Help — DeepNotes`
    : "Help — DeepNotes",
}));
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
    <RouterLink
      to="/help"
      class="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Back to Help
    </RouterLink>

    <template v-if="article">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
        {{ article.title }}
      </h1>
      <div
        class="prose prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:mt-8 prose-headings:mb-3 prose-li:my-1"
        v-html="article.content"
      />
    </template>

    <div v-else class="text-center text-muted-foreground">
      <p>Article not found.</p>
      <RouterLink to="/help" class="mt-4 inline-block text-primary underline">
        Browse all articles
      </RouterLink>
    </div>
  </div>
</template>

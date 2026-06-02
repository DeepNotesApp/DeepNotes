<script setup lang="ts">
import { useHead } from "@unhead/vue";
import DocumentIndexLayout from "@/components/DocumentIndexLayout.vue";

useHead({
  title: "Terms of Service — DeepNotes",
  meta: [
    {
      name: "description",
      content: "DeepNotes terms of service.",
    },
  ],
});

const markdownSource = `
## Legal Entity Status

When we say "we", "our", or "us" in this document, we are referring to Gustavo Toyota.
DeepNotes is not a registered company and references to the app should not be taken as a representation of a legally formed entity.

## User Responsibility

### Security of Devices and Email Account

You are responsible for maintaining the security of your devices and email account.
We cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.

### Account Content and Activity

You are responsible for all content posted and activity that occurs under your account.

### Human Account Requirement

You must be a human. Accounts registered by "bots" or other automated methods are not permitted.

## Acceptable Use

### Server Resource Abuse

We do not tolerate the abuse of our server resources.
If your usage of the services exceeds the average usage of other customers, we reserve the right to temporarily disable your account.
In most cases, we will reach out to you before taking any action, except in rare circumstances where excessive use may negatively impact the performance of the service for other customers.

### Inappropriate Content

We do not accept the display of inappropriate content on public groups.

## Account Suspension

We reserve the right to temporarily disable your account if violate any of the terms of acceptable use.
The account owner will be reached out to before taking any action, except in rare cases where the level of use may negatively impact the Service for other customers.

## Limitation of Liability

By using DeepNotes, you understand and agree that we shall not be liable for any direct, indirect, incidental, lost profits, special, consequential, punitive, or exemplary damages, including but not limited to damages for loss of profits, goodwill, use, data, or other intangible losses. This includes any damages that may result from:

- The use or inability to use the services
- The cost of obtaining substitute goods or services resulting from any goods, data, information, or services purchased or obtained through the services
- Unauthorized access to or alteration of your transmissions or data
- Statements or conduct of any third party on the service
- Any other matter related to the terms of service or the services, whether it be a breach of contract, tort (including active or passive negligence), or any other theory of liability.

## Contact Information

For any questions or concerns, please email us at contact@deepnotes.app.
`;
</script>

<template>
  <DocumentIndexLayout title="Terms of Service" :markdown-source="markdownSource" />
</template>

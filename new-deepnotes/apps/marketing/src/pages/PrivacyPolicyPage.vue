<script setup lang="ts">
import { useHead } from "@unhead/vue";
import DocumentIndexLayout from "@/components/DocumentIndexLayout.vue";

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
</script>

<template>
  <DocumentIndexLayout title="Privacy Policy" :markdown-source="markdownSource" />
</template>

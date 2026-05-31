<script setup lang="ts">
import { ref, computed } from "vue";
import { useHead } from "@unhead/vue";
import { marked } from "marked";

useHead({
  title: "Whitepaper — DeepNotes",
  meta: [
    {
      name: "description",
      content:
        "Technical whitepaper covering DeepNotes encryption, key hierarchy, and real-time collaboration.",
    },
  ],
});

const markdownSource = `
DeepNotes' [source code](https://github.com/DeepNotesApp/DeepNotes) is available on GitHub.

# Overview

## Encryption practices

### Encryption libraries

DeepNotes uses the [Sodium](https://libsodium.gitbook.io/) library for most cryptographic operations.
We also use the library [argon2-browser](https://www.npmjs.com/package/argon2-browser) on the client side for key derivations,
and [CryptoJS](https://www.npmjs.com/package/crypto-js) on the server-side for creating blind indexes.

### Encryption algorithms

Symmetric encryption is done through XChaCha20-Poly1305, and asymmetric encryption is done through X25519-XSalsa20-Poly1305.

Password hashing and key derivations are done using Argon2id.

### Padding variable-length data

We apply 8-byte block padding to variable-length data such as group names, page titles and user aliases using the ISO/IEC 7816-4 padding algorithm.
This means that the length of the padded plaintext is always a multiple of 8 bytes.
This is done to reduce the risk of leaking information about the plaintext through the ciphertext length.
Padding is applied before encryption and removed after decryption.

### Peppering

We add an extra layer of security on the server-side by encrypting user data with keys stored only in environment variables.
This is done so that an attacker who gains access to the database doesn't have direct access to valuable data.
We do this to the following user data: email, password hash, two factor authentication secret, and recovery codes.

In order to keep emails searchable in the database, we create a blind index of the emails using HMAC-SHA256,
again keeping the secret stored only in an environment variable.

### Key rotation

We rotate group encryption keys on every group member removal.
Page encryption keys are rotated on the first user interaction with the page after 7 days have passed since the last page key rotation.

We use keyrings in order to facilitate realtime key rotation.
A keyring is a list of keys, where the first key is the current key, and the rest are previous keys.
On a key rotation, we generate a new key that is added to the beginning of the keyring.
A rotated key must remain in the keyring for at least 24 hours to allow for a smooth transition to the new key.

## Encryption key hierarchy

<figure class="mb-8 mt-6">
  <a href="/whitepaper/key-hierarchy.webp" target="_blank">
    <img src="/whitepaper/key-hierarchy.webp" alt="Encryption key hierarchy in DeepNotes" class="mx-auto rounded-lg border border-border/40" />
  </a>
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">
    Encryption key hierarchy in DeepNotes
  </figcaption>
</figure>

Encryption in DeepNotes starts with the user's master key, which is derived from the user's password, using their email as salt.
This master key encrypts the user's private key and symmetric key, which are stored encrypted in DeepNotes.

Each group member receives a group key and an internal key, which are encrypted asymmetrically using the users' public and private keys.
The group key is public in public groups, and private in private groups, while the internal key is private in both public and private groups.
The internal key exists to keep the group's private key and group member names secret, even in public groups.

Each group has a content key, which is encrypted symmetrically using the group key.
This key is used to encrypt all page-related data in the group.
In password-protected groups this key is wrapped with a key derived from the given password.

Lastly, each page and page snapshot have their own encryption keys.

## Realtime collaboration

DeepNotes uses [Yjs](https://docs.yjs.dev/) for realtime collaboration.

Each page is represented by a Yjs document.
Document updates are encrypted using the page's encryption key before being sent to the server.
Each page update is encrypted with a new random nonce.
The server then broadcasts the encrypted updates to all connected group members and saves them in the database.

## Password protected groups

As mentioned in the encryption key hierarchy, group password protection is done by wrapping the
group content key with another key derived from the group password.
We call this wrapper key the group password key.

In order to derive the group password key, we use a process similar to login authentication.
We use the Argon2id key derivation algorithm using the group ID as salt, with the following settings:
8 iterations, 32 MB memory, 1 thread, and 96 bytes output length.
The output is broken into two parts, where the first 32 bytes are used as the group password key,
and the remaining 64 bytes are used as the password hash.
The password hash is sent to the server to verify that the password is correct.

## Public groups

A group is made public by exposing the group key publicly.
This reveals the group name and content to the public, but not the group members' identities.
When a public group is made private, all group keys are immediately rotated, and
all page keys are set for rotation in the next page activity.

# Operations

## Registering a user

<figure class="mb-8 mt-6">
  <a href="/whitepaper/registration.webp" target="_blank">
    <img src="/whitepaper/registration.webp" alt="Registration process in DeepNotes" class="mx-auto rounded-lg border border-border/40" />
  </a>
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">
    Registration process in DeepNotes
  </figcaption>
</figure>

In order to register a user, we first derive the master key and login hash from the password, using the email as salt.
We then generate a new key pair and a symmetric key, and encrypt the private key and symmetric key with the master key.
The login hash, public key and encrypted keys are then sent to the server.

On the server, we execute 2 iterations of Argon2id on the login hash, using a random salt, to derive a server key and a rehashed login hash.
The server key is used to reencrypt the encrypted keys received from the client.
The email, salt, rehashed login hash, and reencrypted keys are then stored in the database.

## Authenticating a user

<figure class="mb-8 mt-6">
  <a href="/whitepaper/authentication.webp" target="_blank">
    <img src="/whitepaper/authentication.webp" alt="Authentication process in DeepNotes" class="mx-auto rounded-lg border border-border/40" />
  </a>
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">
    Authentication process in DeepNotes
  </figcaption>
</figure>

For user authentication we repeat the same process as in user registration, but instead of storing
those values, we use them to verify the user's identity and decrypt the user's private key and symmetric key.

Having verified the user, we then perform a session start operation, in which we
generate a session ID, a session key and a refresh code. We store the user's private key
and symmetric key encrypted with the session key in local storage.
We also generate an access token and a refresh token, and store them in secure cookies.

## Refreshing a session

<figure class="mb-8 mt-6">
  <a href="/whitepaper/session-refresh.webp" target="_blank">
    <img src="/whitepaper/session-refresh.webp" alt="Session refreshing in DeepNotes" class="mx-auto rounded-lg border border-border/40" />
  </a>
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">
    Session refreshing in DeepNotes
  </figcaption>
</figure>

To refresh a session, we extract the refresh code from the refresh token,
and use it to find the session in the database. If the session isn't found
through the refresh code, we invalidate the session by using the session ID
stored in the refresh token. This is how DeepNotes prevents refresh token reuse.

If the session is found, we generate new session values and tokens for the user and reencrypt the user's keys.

## Adding a group member

We add a group member by encrypting the group key and internal key asymmetrically using the new member's public key.
We then send the encrypted keys to the server, which stores them in the database.

## Removing a group member

We remove a group member by deleting their encrypted keys from the database.
Then we rotate the group keys and set the page keys for rotation in the next page activity.
`;

const html = computed(() => marked.parse(markdownSource));

const headings = computed(() => {
  const result: { level: number; text: string; id: string }[] = [];
  const tokens = marked.lexer(markdownSource);
  for (const token of tokens) {
    if (token.type === "heading") {
      const id = token.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      result.push({ level: token.depth, text: token.text, id });
    }
  }
  return result;
});

const activeHeading = ref("");

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    activeHeading.value = id;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:px-6 md:py-24">
    <!-- Sticky sidebar -->
    <aside class="hidden md:block md:w-64 md:shrink-0">
      <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <nav class="flex flex-col gap-1">
          <button
            v-for="heading in headings"
            :key="heading.id"
            :class="[
              'rounded-md px-3 py-1.5 text-left text-sm transition-colors',
              heading.level === 1 ? 'font-semibold text-foreground' : '',
              heading.level === 2 ? 'pl-5 text-muted-foreground' : '',
              heading.level === 3 ? 'pl-7 text-sm text-muted-foreground' : '',
              activeHeading === heading.id
                ? 'bg-muted text-foreground'
                : 'hover:bg-muted hover:text-foreground',
            ]"
            @click="scrollToHeading(heading.id)"
          >
            {{ heading.text }}
          </button>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <article class="min-w-0 flex-1">
      <h1 class="mb-10 text-center text-4xl font-bold tracking-tight md:text-5xl">
        Whitepaper
      </h1>
      <div
        class="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
        v-html="html"
      />
    </article>
  </div>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer
    class="border-t border-border/40 bg-background py-10 text-sm text-muted-foreground"
  >
    <div
      class="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-6"
    >
      <div class="flex flex-col items-center gap-2 md:items-start">
        <RouterLink to="/" class="flex items-center gap-2">
          <img
            src="/white-logo-outline.webp"
            alt="DeepNotes"
            class="h-6 w-6"
          />
          <span class="font-semibold text-foreground">DeepNotes</span>
        </RouterLink>
        <span>End-to-end encrypted notes and collaboration.</span>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <a
          href="https://discord.gg/UaF2gPTUPh"
          target="_blank"
          class="transition-colors hover:text-foreground"
        >
          Discord
        </a>
        <a
          href="https://www.reddit.com/r/DeepNotesApp/"
          target="_blank"
          class="transition-colors hover:text-foreground"
        >
          Reddit
        </a>
        <a
          href="https://github.com/DeepNotesApp/DeepNotes"
          target="_blank"
          class="transition-colors hover:text-foreground"
        >
          GitHub
        </a>
      </div>

      <div class="flex flex-col items-center gap-2 md:items-end">
        <span>Licensed under AGPL-3.0.</span>
        <span>&copy; {{ currentYear }} DeepNotes</span>
      </div>
    </div>
  </footer>
</template>

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
        <span class="font-semibold text-foreground">DeepNotes</span>
        <span>End-to-end encrypted notes and collaboration.</span>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <RouterLink
          to="/pricing"
          class="hover:text-foreground transition-colors"
        >
          Pricing
        </RouterLink>
        <RouterLink
          to="/help"
          class="hover:text-foreground transition-colors"
        >
          Help
        </RouterLink>
        <RouterLink
          to="/whitepaper"
          class="hover:text-foreground transition-colors"
        >
          Whitepaper
        </RouterLink>
        <RouterLink
          to="/privacy-policy"
          class="hover:text-foreground transition-colors"
        >
          Privacy Policy
        </RouterLink>
        <RouterLink
          to="/terms-of-service"
          class="hover:text-foreground transition-colors"
        >
          Terms of Service
        </RouterLink>
      </div>

      <div class="text-center md:text-right">
        <span>Licensed under AGPL-3.0.</span>
        <br />
        <span>&copy; {{ currentYear }} DeepNotes</span>
      </div>
    </div>
  </footer>
</template>

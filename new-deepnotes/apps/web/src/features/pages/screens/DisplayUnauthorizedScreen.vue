<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/useSession";

const { isAuthenticated } = useSession();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 text-center">
    <div class="text-foreground text-lg font-semibold">Unauthorized</div>
    <p class="text-muted-foreground max-w-md text-sm">
      You do not have permission to access this page.
    </p>

    <div v-if="!isAuthenticated" class="flex flex-wrap justify-center gap-2">
      <Button as-child>
        <RouterLink to="/login">Sign in</RouterLink>
      </Button>
      <Button as-child variant="outline">
        <RouterLink to="/register">Register</RouterLink>
      </Button>
    </div>
  </div>
</template>

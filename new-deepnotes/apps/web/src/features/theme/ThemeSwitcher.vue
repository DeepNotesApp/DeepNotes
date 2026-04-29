<script setup lang="ts">
import { Moon, Sun, SunMoon } from "lucide-vue-next";

import { useThemePreference } from "./useThemePreference";

const { preference } = useThemePreference();

const options: { value: "system" | "light" | "dark"; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function iconFor(mode: "system" | "light" | "dark") {
  if (mode === "light") return Sun;
  if (mode === "dark") return Moon;
  return SunMoon;
}
</script>

<template>
  <div
    class="border-input bg-background text-foreground focus-within:ring-ring/50 flex h-8 min-w-0 max-w-40 shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 focus-within:ring-2 focus-within:outline-none"
  >
    <component
      :is="iconFor(preference)"
      class="text-muted-foreground size-3.5 shrink-0"
      aria-hidden="true"
    />
    <select
      id="theme-select"
      v-model="preference"
      class="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-xs font-medium outline-none"
      aria-label="Color theme"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

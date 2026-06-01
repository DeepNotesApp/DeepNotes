<script setup lang="ts">
import type { DropdownMenuItemProps } from 'reka-ui'
import { DropdownMenuItem, useForwardProps } from 'reka-ui'

const props = withDefaults(defineProps<DropdownMenuItemProps & { inset?: boolean }>(), {
  inset: false,
})

const { inset, ...rest } = props
const forwardedProps = useForwardProps(rest)
</script>

<template>
  <DropdownMenuItem
    v-bind="forwardedProps"
    class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
    :class="props.inset && 'pl-8'"
  >
    <slot />
  </DropdownMenuItem>
</template>

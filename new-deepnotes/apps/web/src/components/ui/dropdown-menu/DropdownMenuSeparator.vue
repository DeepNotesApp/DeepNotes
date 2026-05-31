<script setup lang="ts">
import type { DropdownMenuSeparatorProps } from 'reka-ui'
import { DropdownMenuSeparator, useForwardProps } from 'reka-ui'

const props = defineProps<DropdownMenuSeparatorProps>()

const forwardedProps = useForwardProps(props)
</script>

<template>
  <DropdownMenuSeparator v-bind="forwardedProps" class="-mx-1 my-1 h-px bg-muted" />
</template>

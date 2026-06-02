<script setup lang="ts">
import { computed } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Trash2, Copy, Scissors, ArrowUp, ArrowDown, ClipboardPaste, Files, ListChecks } from '@lucide/vue'

const props = defineProps<{
  x: number
  y: number
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  delete: []
  copy: []
  cut: []
  paste: []
  duplicate: []
  'select-all': []
  'bring-to-front': []
  'send-to-back': []
}>()

const menuOpen = computed({
  get: () => props.open,
  set: (value) => {
    if (!value) emit('close')
  },
})

function handleDelete() {
  emit('delete')
  emit('close')
}

function handleCopy() {
  emit('copy')
  emit('close')
}

function handleCut() {
  emit('cut')
  emit('close')
}

function handleBringToFront() {
  emit('bring-to-front')
  emit('close')
}

function handleSendToBack() {
  emit('send-to-back')
  emit('close')
}

function handlePaste() {
  emit('paste')
  emit('close')
}

function handleDuplicate() {
  emit('duplicate')
  emit('close')
}

function handleSelectAll() {
  emit('select-all')
  emit('close')
}
</script>

<template>
  <DropdownMenu v-model:open="menuOpen">
    <DropdownMenuContent
      class="w-48"
      :style="{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
      }"
    >
      <DropdownMenuItem @click="handleBringToFront">
        <ArrowUp class="h-4 w-4" />
        <span>Bring to front</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="handleSendToBack">
        <ArrowDown class="h-4 w-4" />
        <span>Send to back</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem @click="handlePaste">
        <ClipboardPaste class="h-4 w-4" />
        <span>Paste</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="handleCopy">
        <Copy class="h-4 w-4" />
        <span>Copy</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="handleCut">
        <Scissors class="h-4 w-4" />
        <span>Cut</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="handleDuplicate">
        <Files class="h-4 w-4" />
        <span>Duplicate</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="handleSelectAll">
        <ListChecks class="h-4 w-4" />
        <span>Select all</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem @click="handleDelete" class="text-destructive">
        <Trash2 class="h-4 w-4" />
        <span>Delete</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

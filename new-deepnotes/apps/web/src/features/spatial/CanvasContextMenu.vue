<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Clipboard, Trash2, Copy, Scissors, Files, ListChecks } from '@lucide/vue'
import type { ClipboardNote, ClipboardArrow } from './clipboard'
import { readClipboardPayload } from './clipboard'

const props = defineProps<{
  x: number
  y: number
  open: boolean
  onCreateNote: (x: number, y: number) => void
  onPaste: (payload: { notes: ClipboardNote[]; arrows: ClipboardArrow[] }) => void
  onDeleteSelected: () => void
  onCopySelected: () => void
  onCutSelected: () => void
  onDuplicateSelected: () => void
  onSelectAll: () => void
  hasSelection: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const menuOpen = computed({
  get: () => props.open,
  set: (value) => {
    if (!value) emit('close')
  },
})

function handleCreateNote() {
  props.onCreateNote(props.x, props.y)
  emit('close')
}

async function handlePaste() {
  const payload = await readClipboardPayload()
  if (payload && payload.notes.length > 0) {
    props.onPaste(payload)
  }
  emit('close')
}

function handleDeleteSelected() {
  props.onDeleteSelected()
  emit('close')
}

function handleCopySelected() {
  props.onCopySelected()
  emit('close')
}

function handleCutSelected() {
  props.onCutSelected()
  emit('close')
}

function handleDuplicateSelected() {
  props.onDuplicateSelected()
  emit('close')
}

function handleSelectAll() {
  props.onSelectAll()
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
      <DropdownMenuItem @click="handleCreateNote">
        <Plus class="h-4 w-4" />
        <span>Create note</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem @click="handlePaste">
        <Clipboard class="h-4 w-4" />
        <span>Paste</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator v-if="hasSelection" />

      <DropdownMenuItem v-if="hasSelection" @click="handleDuplicateSelected">
        <Files class="h-4 w-4" />
        <span>Duplicate</span>
      </DropdownMenuItem>

      <DropdownMenuItem v-if="hasSelection" @click="handleCopySelected">
        <Copy class="h-4 w-4" />
        <span>Copy</span>
      </DropdownMenuItem>

      <DropdownMenuItem v-if="hasSelection" @click="handleCutSelected">
        <Scissors class="h-4 w-4" />
        <span>Cut</span>
      </DropdownMenuItem>

      <DropdownMenuItem v-if="hasSelection" @click="handleDeleteSelected" class="text-destructive">
        <Trash2 class="h-4 w-4" />
        <span>Delete</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

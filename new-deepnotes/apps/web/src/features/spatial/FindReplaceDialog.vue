<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, X, ArrowUp, ArrowDown, Replace } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { NoteMatch } from './find-replace'
import { searchNotes, replaceInNote } from './find-replace'
import type { NoteModel } from './note-model'

const props = defineProps<{
  open: boolean
  notes: { id: string; model: NoteModel }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const query = ref('')
const replacement = ref('')
const matches = ref<NoteMatch[]>([])
const currentMatchIndex = ref(0)

const currentMatch = computed(() => {
  if (matches.value.length === 0 || currentMatchIndex.value >= matches.value.length) return null
  return matches.value[currentMatchIndex.value]
})

const matchCount = computed(() => matches.value.length)

function performSearch() {
  if (!query.value.trim()) {
    matches.value = []
    currentMatchIndex.value = 0
    return
  }
  matches.value = searchNotes(props.notes, query.value)
  currentMatchIndex.value = 0
}

function nextMatch() {
  if (matches.value.length === 0) return
  currentMatchIndex.value = (currentMatchIndex.value + 1) % matches.value.length
}

function previousMatch() {
  if (matches.value.length === 0) return
  currentMatchIndex.value = (currentMatchIndex.value - 1 + matches.value.length) % matches.value.length
}

function replaceCurrent() {
  const match = currentMatch.value
  if (!match) return
  
  const note = props.notes.find(n => n.id === match.noteId)
  if (!note) return
  
  replaceInNote(note.model, match.field, match.index, match.length, replacement.value)
  
  // Re-search after replacement
  performSearch()
}

function replaceAll() {
  for (const match of matches.value) {
    const note = props.notes.find(n => n.id === match.noteId)
    if (note) {
      replaceInNote(note.model, match.field, match.index, match.length, replacement.value)
    }
  }
  matches.value = []
  currentMatchIndex.value = 0
}

function handleClose() {
  emit('close')
  query.value = ''
  replacement.value = ''
  matches.value = []
  currentMatchIndex.value = 0
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="handleClose"
    >
      <Card class="w-full max-w-md">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Find and Replace</CardTitle>
          <Button variant="ghost" size="icon" @click="handleClose">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="search">Find</Label>
            <div class="flex gap-2">
              <Input
                id="search"
                v-model="query"
                placeholder="Search in notes..."
                @input="performSearch"
                @keydown.enter.prevent="nextMatch"
              />
              <Button
                variant="outline"
                size="icon"
                :disabled="matchCount === 0"
                @click="previousMatch"
                title="Previous match (Shift+Enter)"
              >
                <ArrowUp class="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                :disabled="matchCount === 0"
                @click="nextMatch"
                title="Next match (Enter)"
              >
                <ArrowDown class="h-4 w-4" />
              </Button>
            </div>
            <p v-if="matchCount > 0" class="text-xs text-muted-foreground">
              {{ currentMatchIndex + 1 }} of {{ matchCount }} matches
            </p>
            <p v-else-if="query" class="text-xs text-muted-foreground">
              No matches found
            </p>
          </div>

          <div class="space-y-2">
            <Label for="replace">Replace with</Label>
            <div class="flex gap-2">
              <Input
                id="replace"
                v-model="replacement"
                placeholder="Replacement text..."
                @keydown.enter.prevent="replaceCurrent"
              />
              <Button
                variant="outline"
                size="icon"
                :disabled="matchCount === 0"
                @click="replaceCurrent"
                title="Replace current match"
              >
                <Replace class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button
              variant="outline"
              :disabled="matchCount === 0"
              @click="replaceAll"
            >
              Replace All ({{ matchCount }})
            </Button>
          </div>

          <div v-if="currentMatch" class="rounded-md border bg-muted/50 p-3 text-sm">
            <p class="font-medium">Current match:</p>
            <p class="text-muted-foreground">
              Note: <span class="font-mono">{{ currentMatch.noteId }}</span>
            </p>
            <p class="text-muted-foreground">
              Field: {{ currentMatch.field }}
            </p>
            <p class="text-muted-foreground mt-1">
              "{{ currentMatch.text.substring(currentMatch.index, currentMatch.index + currentMatch.length) }}"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </Teleport>
</template>

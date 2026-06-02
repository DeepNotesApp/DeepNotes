<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, Copy, ArrowUpDown, FilePlus, Save, Download, ArrowDownUp, Import } from '@lucide/vue'
import ColorPalette from '@/components/ColorPalette.vue'
import { getNoteEditor } from './note-editor-registry'
import TurndownService from 'turndown'

const props = defineProps<{
  noteId: string | null
  noteModel: any
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:link': [value: string]
  'update:head-enabled': [value: boolean]
  'update:body-enabled': [value: boolean]
  'update:head-wrap': [value: boolean]
  'update:body-wrap': [value: boolean]
  'update:pos-x': [value: number]
  'update:pos-y': [value: number]
  'update:anchor-x': [value: number]
  'update:anchor-y': [value: number]
  'update:width': [value: string]
  'update:height': [value: string]
  'update:color': [value: string]
  'update:color-inherit': [value: boolean]
  'update:collapsible': [value: boolean]
  'update:collapsed': [value: boolean]
  'update:movable': [value: boolean]
  'update:resizable': [value: boolean]
  'update:read-only': [value: boolean]
  'update:container-enabled': [value: boolean]
  'update:container-horizontal': [value: boolean]
  'update:container-spatial': [value: boolean]
  'update:container-wrap-children': [value: boolean]
  'update:container-stretch-children': [value: boolean]
  'update:container-force-color-inheritance': [value: boolean]
  'update:local-collapsing': [value: boolean]
  'update:locally-collapsed': [value: boolean]
  'create-new-page': []
  'swap-head-body': []
  'copy-link': []
  'set-as-default': []
  'reverse-children': []
  'import-children': [files: FileList]
}>()

const link = computed(() => props.noteModel?.link?.value ?? '')
const headEnabled = computed(() => props.noteModel?.head?.enabled?.value ?? true)
const bodyEnabled = computed(() => props.noteModel?.body?.enabled?.value ?? true)
const posX = computed(() => props.noteModel?.pos?.value?.x ?? 0)
const posY = computed(() => props.noteModel?.pos?.value?.y ?? 0)
const anchorX = computed(() => props.noteModel?.anchor?.value?.x ?? 0.5)
const anchorY = computed(() => props.noteModel?.anchor?.value?.y ?? 0.5)
const width = computed(() => props.noteModel?.width?.value?.expanded ?? 'Auto')
const height = computed(() => props.noteModel?.height?.value?.expanded ?? 'Auto')
const color = computed(() => props.noteModel?.colorValue?.value ?? 'grey')
const colorInherit = computed(() => props.noteModel?.colorInherit?.value ?? false)
const collapsible = computed(() => props.noteModel?.collapsing?.enabled?.value ?? false)
const collapsed = computed(() => props.noteModel?.collapsing?.collapsed?.value ?? false)
const movable = computed(() => props.noteModel?.movable?.value ?? true)
const resizable = computed(() => props.noteModel?.resizable?.value ?? true)
const readOnly = computed(() => props.noteModel?.readOnly?.value ?? false)
const containerEnabled = computed(() => props.noteModel?.container?.enabled?.value ?? false)
const containerHorizontal = computed(() => props.noteModel?.container?.horizontal?.value ?? false)
const containerSpatial = computed(() => props.noteModel?.container?.spatial?.value ?? false)
const containerWrapChildren = computed(() => props.noteModel?.container?.wrapChildren?.value ?? false)
const containerStretchChildren = computed(() => props.noteModel?.container?.stretchChildren?.value ?? false)
const containerForceColorInheritance = computed(() => props.noteModel?.container?.forceColorInheritance?.value ?? false)
const headWrap = computed(() => props.noteModel?.head?.wrap?.value ?? true)
const bodyWrap = computed(() => props.noteModel?.body?.wrap?.value ?? true)
const localCollapsing = computed(() => props.noteModel?.collapsing?.localCollapsing?.value ?? false)
const locallyCollapsed = computed(() => props.noteModel?.collapsing?.locallyCollapsed?.value ?? false)
const createdAt = computed(() => props.noteModel?.createdAt?.value ?? null)
const editedAt = computed(() => props.noteModel?.editedAt?.value ?? null)
const movedAt = computed(() => props.noteModel?.movedAt?.value ?? null)

function formatTimestamp(ts: number | null): string {
  if (ts == null) return ''
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
}

function handleCopyLink() {
  if (!props.noteId) return
  const url = `${window.location.origin}/pages/${props.noteId}?elem=${props.noteId}`
  navigator.clipboard.writeText(url)
}

const fileInput = ref<HTMLInputElement | null>(null)

function handleReverseChildren() {
  emit('reverse-children')
}

function handleImportClick() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('import-children', target.files)
    target.value = ''
  }
}

function handleColorSelect(colorName: string) {
  emit('update:color', colorName)
  emit('update:color-inherit', false)
}

const isWidthNumeric = computed(() => {
  const w = width.value
  return w !== 'Auto' && w !== 'Minimum'
})

const isHeightNumeric = computed(() => {
  const h = height.value
  return h !== 'Auto' && h !== 'Minimum'
})

function handleWidthModeChange(mode: string) {
  if (mode === 'Custom') {
    emit('update:width', '160')
  } else {
    emit('update:width', mode)
  }
}

function handleHeightModeChange(mode: string) {
  if (mode === 'Custom') {
    emit('update:height', '80')
  } else {
    emit('update:height', mode)
  }
}

function htmlToMarkdown(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Flatten divs inside list items (Tiptap task lists produce these)
  const divs = doc.querySelectorAll('li > div')
  for (let i = divs.length - 1; i >= 0; i--) {
    const el = divs.item(i)
    el.outerHTML = el.innerHTML
  }
  const paragraphs = doc.querySelectorAll('li > p')
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const el = paragraphs.item(i)
    el.outerHTML = el.innerHTML
  }

  const td = new TurndownService({
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
    hr: '---',
  })

  td.addRule('strikethrough', {
    filter: ['s' as keyof HTMLElementTagNameMap],
    replacement: (content) => `~~${content}~~`,
  })
  td.addRule('math-block', {
    filter: ['math-block' as keyof HTMLElementTagNameMap],
    replacement: (content) => `\n\n$$\n${content}\n$$\n\n`,
  })
  td.addRule('inline-math', {
    filter: ['inline-math' as keyof HTMLElementTagNameMap],
    replacement: (content) => `$${content}$`,
  })
  td.keep(['u', 'sub', 'sup', 'table', 'iframe'])

  return td.turndown(doc.body.innerHTML)
}

function exportAsMarkdown(download: boolean) {
  if (!props.noteId) return

  let markdown = ''
  let hasPrevSection = false

  for (const section of ['head', 'body'] as const) {
    const editor = getNoteEditor(props.noteId, section)
    if (!editor) continue
    const html = editor.getHTML()
    if (!html || html === '<p></p>') continue

    if (hasPrevSection) {
      markdown += '\n\n---\n\n'
    }
    markdown += htmlToMarkdown(html)
    hasPrevSection = true
  }

  if (!markdown) {
    markdown = '# Empty note\n'
  }

  if (download) {
    const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'note.md'
    a.click()
    URL.revokeObjectURL(a.href)
  } else {
    navigator.clipboard.writeText(markdown)
  }
}
</script>

<template>
  <div v-if="noteId" data-testid="note-properties-card" class="space-y-3 text-xs">
      <!-- Link -->
      <div class="space-y-2">
        <Label>Link</Label>
        <div class="flex gap-2">
          <Input
            :model-value="link"
            placeholder="https://..."
            class="h-8 text-xs"
            :disabled="readOnly"
            @update:model-value="emit('update:link', $event as string)"
          />
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 shrink-0"
            :disabled="!link"
            @click="handleCopyLink"
          >
            <Copy class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <!-- Create new page -->
      <Button
        variant="default"
        size="sm"
        class="w-full"
        :disabled="readOnly"
        @click="emit('create-new-page')"
      >
        <FilePlus class="h-3 w-3 mr-2" />
        Create new page
      </Button>

      <!-- Head/Body -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="headEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:head-enabled', $event as boolean)"
          />
          <Label>Head</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="bodyEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:body-enabled', $event as boolean)"
          />
          <Label>Body</Label>
        </div>
      </div>

      <!-- Swap head and body -->
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        :disabled="readOnly"
        @click="emit('swap-head-body')"
      >
        <ArrowUpDown class="h-3 w-3 mr-2" />
        Swap head and body
      </Button>

      <!-- Wrap -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="headWrap"
            :disabled="readOnly"
            @update:model-value="emit('update:head-wrap', $event as boolean)"
          />
          <Label>Head wrap</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="bodyWrap"
            :disabled="readOnly"
            @update:model-value="emit('update:body-wrap', $event as boolean)"
          />
          <Label>Body wrap</Label>
        </div>
      </div>

      <!-- Position -->
      <div class="space-y-2">
        <Label>Position</Label>
        <div class="flex gap-2">
          <div class="flex-1">
            <Input
              type="number"
              :model-value="posX"
              class="h-8 text-xs"
              :disabled="readOnly"
              @update:model-value="emit('update:pos-x', Number($event) || 0)"
            />
          </div>
          <div class="flex-1">
            <Input
              type="number"
              :model-value="posY"
              class="h-8 text-xs"
              :disabled="readOnly"
              @update:model-value="emit('update:pos-y', Number($event) || 0)"
            />
          </div>
        </div>
      </div>

      <!-- Anchor -->
      <div class="space-y-2">
        <Label>Anchor</Label>
        <div class="flex gap-2">
          <div class="flex-1">
            <Select
              :model-value="String(anchorX)"
              :disabled="readOnly"
              @update:model-value="emit('update:anchor-x', Number($event))"
            >
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="X" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Left</SelectItem>
                <SelectItem value="0.5">Center</SelectItem>
                <SelectItem value="1">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex-1">
            <Select
              :model-value="String(anchorY)"
              :disabled="readOnly"
              @update:model-value="emit('update:anchor-y', Number($event))"
            >
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="Y" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Top</SelectItem>
                <SelectItem value="0.5">Center</SelectItem>
                <SelectItem value="1">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Width / Height -->
      <div class="space-y-2">
        <Label>Width</Label>
        <div class="flex gap-2">
          <Select
            :model-value="isWidthNumeric ? 'Custom' : width"
            :disabled="readOnly"
            @update:model-value="handleWidthModeChange($event as string)"
          >
            <SelectTrigger class="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="Minimum">Minimum</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-if="isWidthNumeric"
            type="number"
            :model-value="Number(width) || 0"
            class="h-8 w-20 text-xs"
            :disabled="readOnly"
            @update:model-value="emit('update:width', String($event))"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label>Height</Label>
        <div class="flex gap-2">
          <Select
            :model-value="isHeightNumeric ? 'Custom' : height"
            :disabled="readOnly"
            @update:model-value="handleHeightModeChange($event as string)"
          >
            <SelectTrigger class="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="Minimum">Minimum</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-if="isHeightNumeric"
            type="number"
            :model-value="Number(height) || 0"
            class="h-8 w-20 text-xs"
            :disabled="readOnly"
            @update:model-value="emit('update:height', String($event))"
          />
        </div>
      </div>

      <!-- Color -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Color</Label>
          <div class="flex items-center gap-2">
            <Switch
              :model-value="colorInherit"
              :disabled="readOnly"
              @update:model-value="emit('update:color-inherit', $event as boolean)"
            />
            <Label class="text-[10px]">Inherit</Label>
          </div>
        </div>
        <div class="flex justify-center">
          <ColorPalette
            type="notes"
            orientation="horizontal"
            :split="2"
            :model-value="color"
            :disabled="readOnly || colorInherit"
            @update:model-value="handleColorSelect($event as string)"
          />
        </div>
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Copy link / Set as default / Export -->
      <div class="space-y-2">
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          @click="emit('copy-link')"
        >
          <Copy class="h-3 w-3 mr-2" />
          Copy link to this note
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          :disabled="readOnly"
          @click="emit('set-as-default')"
        >
          <Save class="h-3 w-3 mr-2" />
          Set as default note style
        </Button>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :disabled="readOnly"
            @click="exportAsMarkdown(false)"
          >
            <Copy class="h-3 w-3 mr-1" />
            Copy MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :disabled="readOnly"
            @click="exportAsMarkdown(true)"
          >
            <Download class="h-3 w-3 mr-1" />
            Download MD
          </Button>
        </div>
      </div>

      <!-- Timestamps -->
      <div v-if="createdAt || editedAt || movedAt" class="space-y-1 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
        <div v-if="createdAt">
          <span class="font-medium text-foreground">Created:</span> {{ formatTimestamp(createdAt) }}
        </div>
        <div v-if="editedAt">
          <span class="font-medium text-foreground">Edited:</span> {{ formatTimestamp(editedAt) }}
        </div>
        <div v-if="movedAt">
          <span class="font-medium text-foreground">Moved:</span> {{ formatTimestamp(movedAt) }}
        </div>
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Collapsing -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="collapsible"
            :disabled="readOnly"
            @update:model-value="emit('update:collapsible', $event as boolean)"
          />
          <Label class="text-xs">Collapsible</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="collapsed"
            :disabled="readOnly || !collapsible"
            @update:model-value="emit('update:collapsed', $event as boolean)"
          />
          <Label class="text-xs">Collapsed</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="localCollapsing"
            :disabled="readOnly || !collapsible"
            @update:model-value="emit('update:local-collapsing', $event as boolean)"
          />
          <Label class="text-xs">Local collapsing</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="locallyCollapsed"
            :disabled="readOnly || !collapsible || !localCollapsing"
            @update:model-value="emit('update:locally-collapsed', $event as boolean)"
          />
          <Label class="text-xs">Locally collapsed</Label>
        </div>
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Container -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="containerEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:container-enabled', $event as boolean)"
          />
          <Label class="text-xs">Container</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="containerSpatial"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-spatial', $event as boolean)"
          />
          <Label class="text-xs">Spatial</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="containerHorizontal"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-horizontal', $event as boolean)"
          />
          <Label class="text-xs">Horizontal layout</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="containerWrapChildren"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-wrap-children', $event as boolean)"
          />
          <Label class="text-xs">Wrap children</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="containerStretchChildren"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-stretch-children', $event as boolean)"
          />
          <Label class="text-xs">Stretch children</Label>
        </div>
        <div class="flex items-center gap-2 pl-5">
          <Switch
            :model-value="containerForceColorInheritance"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-force-color-inheritance', $event as boolean)"
          />
          <Label class="text-xs">Force color inheritance</Label>
        </div>
        <div class="flex items-center gap-2 pl-5 pt-1">
          <Button
            variant="outline"
            size="sm"
            :disabled="readOnly || !containerEnabled || (props.noteModel?.container?.children?.value?.length ?? 0) < 2"
            @click="handleReverseChildren"
          >
            <ArrowDownUp class="mr-1 h-3 w-3" />
            Reverse children
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="readOnly || (containerEnabled && containerSpatial)"
            @click="handleImportClick"
          >
            <Import class="mr-1 h-3 w-3" />
            Import children
          </Button>
          <input
            ref="fileInput"
            type="file"
            accept=".txt,.md"
            multiple
            class="hidden"
            @change="handleFileChange"
          />
        </div>
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Movable/Resizable -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="movable"
            :disabled="readOnly"
            @update:model-value="emit('update:movable', $event as boolean)"
          />
          <Label class="text-xs">Movable</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="resizable"
            :disabled="readOnly"
            @update:model-value="emit('update:resizable', $event as boolean)"
          />
          <Label class="text-xs">Resizable</Label>
        </div>
      </div>

      <!-- Read-only -->
      <div class="flex items-center gap-2">
        <Switch
          :model-value="readOnly"
          :disabled="readOnly"
          @update:model-value="emit('update:read-only', $event as boolean)"
        />
        <Label class="text-xs">Read-only</Label>
      </div>
    </div>
</template>

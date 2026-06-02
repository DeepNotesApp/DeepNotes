<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ExternalLink, Copy, Palette, ArrowUpDown, FilePlus, Save } from '@lucide/vue'

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
  'update:color': [value: number]
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
const color = computed(() => props.noteModel?.color?.value ?? 0)
const colorInherit = computed(() => props.noteModel?.color?.inherit?.value ?? false)
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

const colors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function handleCopyLink() {
  if (!props.noteId) return
  const url = `${window.location.origin}/pages/${props.noteId}?elem=${props.noteId}`
  navigator.clipboard.writeText(url)
}

function handleColorSelect(colorIndex: number) {
  emit('update:color', colorIndex)
  emit('update:color-inherit', false)
}
</script>

<template>
  <Card v-if="noteId" data-testid="note-properties-card">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm">Note Properties</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 text-xs">
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
        <Select
          :model-value="width"
          :disabled="readOnly"
          @update:model-value="emit('update:width', $event as string)"
        >
          <SelectTrigger class="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Auto">Auto</SelectItem>
            <SelectItem value="Minimum">Minimum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label>Height</Label>
        <Select
          :model-value="height"
          :disabled="readOnly"
          @update:model-value="emit('update:height', $event as string)"
        >
          <SelectTrigger class="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Auto">Auto</SelectItem>
            <SelectItem value="Minimum">Minimum</SelectItem>
          </SelectContent>
        </Select>
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
        <div class="flex justify-center gap-1">
          <button
            v-for="c in colors"
            :key="c"
            class="h-6 w-6 rounded-full border-2 transition-all hover:scale-110"
            :class="{
              'border-primary': color === c && !colorInherit,
              'border-transparent': color !== c || colorInherit,
              'opacity-50': colorInherit,
            }"
            :style="{ backgroundColor: `hsl(${c * 36}, 70%, 50%)` }"
            :disabled="readOnly"
            @click="handleColorSelect(c)"
          />
        </div>
      </div>

      <!-- Copy link / Set as default -->
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
      </div>

      <!-- Timestamps -->
      <div v-if="createdAt || editedAt || movedAt" class="space-y-1 text-[11px] text-muted-foreground">
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

      <!-- Collapsing -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="collapsible"
            :disabled="readOnly"
            @update:model-value="emit('update:collapsible', $event as boolean)"
          />
          <Label>Collapsible</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="collapsed"
            :disabled="readOnly || !collapsible"
            @update:model-value="emit('update:collapsed', $event as boolean)"
          />
          <Label>Collapsed</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="localCollapsing"
            :disabled="readOnly || !collapsible"
            @update:model-value="emit('update:local-collapsing', $event as boolean)"
          />
          <Label>Local collapsing</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="locallyCollapsed"
            :disabled="readOnly || !collapsible || !localCollapsing"
            @update:model-value="emit('update:locally-collapsed', $event as boolean)"
          />
          <Label>Locally collapsed</Label>
        </div>
      </div>

      <!-- Container -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="containerEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:container-enabled', $event as boolean)"
          />
          <Label>Container</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerSpatial"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-spatial', $event as boolean)"
          />
          <Label>Spatial</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerHorizontal"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-horizontal', $event as boolean)"
          />
          <Label>Horizontal layout</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerWrapChildren"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-wrap-children', $event as boolean)"
          />
          <Label>Wrap children</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerStretchChildren"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-stretch-children', $event as boolean)"
          />
          <Label>Stretch children</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerForceColorInheritance"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-force-color-inheritance', $event as boolean)"
          />
          <Label>Force color inheritance</Label>
        </div>
      </div>

      <!-- Movable/Resizable -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="movable"
            :disabled="readOnly"
            @update:model-value="emit('update:movable', $event as boolean)"
          />
          <Label>Movable</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="resizable"
            :disabled="readOnly"
            @update:model-value="emit('update:resizable', $event as boolean)"
          />
          <Label>Resizable</Label>
        </div>
      </div>

      <!-- Read-only -->
      <div class="flex items-center gap-2">
        <Switch
          :model-value="readOnly"
          :disabled="readOnly"
          @update:model-value="emit('update:read-only', $event as boolean)"
        />
        <Label>Read-only</Label>
      </div>
    </CardContent>
  </Card>
</template>

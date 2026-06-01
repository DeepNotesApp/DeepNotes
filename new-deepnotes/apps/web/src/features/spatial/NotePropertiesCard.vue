<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ExternalLink, Copy, Palette } from 'lucide-vue-next'

const props = defineProps<{
  noteId: string | null
  noteModel: any
  readOnly?: boolean
}>()

const emit = defineEmits({
  'update:link': (value: string) => true,
  'update:head-enabled': (value: boolean) => true,
  'update:body-enabled': (value: boolean) => true,
  'update:head-wrap': (value: boolean) => true,
  'update:body-wrap': (value: boolean) => true,
  'update:pos-x': (value: number) => true,
  'update:pos-y': (value: number) => true,
  'update:anchor-x': (value: number) => true,
  'update:anchor-y': (value: number) => true,
  'update:width': (value: string) => true,
  'update:color': (value: number) => true,
  'update:color-inherit': (value: boolean) => true,
  'update:collapsible': (value: boolean) => true,
  'update:collapsed': (value: boolean) => true,
  'update:movable': (value: boolean) => true,
  'update:resizable': (value: boolean) => true,
  'update:read-only': (value: boolean) => true,
  'update:container-enabled': (value: boolean) => true,
  'update:container-horizontal': (value: boolean) => true,
  'update:container-spatial': (value: boolean) => true,
  'update:container-wrap-children': (value: boolean) => true,
  'update:container-stretch-children': (value: boolean) => true,
  'update:container-force-color-inheritance': (value: boolean) => true,
})

const link = computed(() => props.noteModel?.link?.value ?? '')
const headEnabled = computed(() => props.noteModel?.head?.enabled?.value ?? true)
const bodyEnabled = computed(() => props.noteModel?.body?.enabled?.value ?? true)
const posX = computed(() => props.noteModel?.pos?.value?.x ?? 0)
const posY = computed(() => props.noteModel?.pos?.value?.y ?? 0)
const anchorX = computed(() => props.noteModel?.anchor?.value?.x ?? 0.5)
const anchorY = computed(() => props.noteModel?.anchor?.value?.y ?? 0.5)
const width = computed(() => props.noteModel?.width?.value?.expanded ?? 'Auto')
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
            @update:model-value="emit('update:link', $event)"
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

      <!-- Head/Body -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="headEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:head-enabled', $event)"
          />
          <Label>Head</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="bodyEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:body-enabled', $event)"
          />
          <Label>Body</Label>
        </div>
      </div>

      <!-- Wrap -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="headWrap"
            :disabled="readOnly"
            @update:model-value="emit('update:head-wrap', Boolean($event))"
          />
          <Label>Head wrap</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="bodyWrap"
            :disabled="readOnly"
            @update:model-value="emit('update:body-wrap', Boolean($event))"
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
              @update:model-value="emit('update:pos-x', parseFloat(String($event)) || 0)"
            />
          </div>
          <div class="flex-1">
            <Input
              type="number"
              :model-value="posY"
              class="h-8 text-xs"
              :disabled="readOnly"
              @update:model-value="emit('update:pos-y', parseFloat(String($event)) || 0)"
            />
          </div>
        </div>
      </div>

      <!-- Anchor -->
      <div class="space-y-2">
        <Label>Anchor</Label>
        <div class="flex gap-2">
          <div class="flex-1">
            <select
              :value="anchorX"
              class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              :disabled="readOnly"
              @change="emit('update:anchor-x', parseFloat(($event.target as HTMLSelectElement).value))"
            >
              <option value="0">Left</option>
              <option value="0.5">Center</option>
              <option value="1">Right</option>
            </select>
          </div>
          <div class="flex-1">
            <select
              :value="anchorY"
              class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              :disabled="readOnly"
              @change="emit('update:anchor-y', parseFloat(($event.target as HTMLSelectElement).value))"
            >
              <option value="0">Top</option>
              <option value="0.5">Center</option>
              <option value="1">Bottom</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Width -->
      <div class="space-y-2">
        <Label>Width</Label>
        <select
          :value="width"
          class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          :disabled="readOnly"
          @change="emit('update:width', ($event.target as HTMLSelectElement).value)"
        >
          <option value="Auto">Auto</option>
          <option value="Minimum">Minimum</option>
        </select>
      </div>

      <!-- Color -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Color</Label>
          <div class="flex items-center gap-2">
            <Switch
              :model-value="colorInherit"
              :disabled="readOnly"
              @update:model-value="emit('update:color-inherit', $event)"
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

      <!-- Collapsing -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="collapsible"
            :disabled="readOnly"
            @update:model-value="emit('update:collapsible', $event)"
          />
          <Label>Collapsible</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="collapsed"
            :disabled="readOnly || !collapsible"
            @update:model-value="emit('update:collapsed', $event)"
          />
          <Label>Collapsed</Label>
        </div>
      </div>

      <!-- Container -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Switch
            :model-value="containerEnabled"
            :disabled="readOnly"
            @update:model-value="emit('update:container-enabled', $event)"
          />
          <Label>Container</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerSpatial"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-spatial', $event)"
          />
          <Label>Spatial</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerHorizontal"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-horizontal', $event)"
          />
          <Label>Horizontal layout</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerWrapChildren"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-wrap-children', $event)"
          />
          <Label>Wrap children</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerStretchChildren"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-stretch-children', $event)"
          />
          <Label>Stretch children</Label>
        </div>
        <div class="flex items-center gap-2 pl-6">
          <Switch
            :model-value="containerForceColorInheritance"
            :disabled="readOnly || !containerEnabled"
            @update:model-value="emit('update:container-force-color-inheritance', $event)"
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
            @update:model-value="emit('update:movable', $event)"
          />
          <Label>Movable</Label>
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :model-value="resizable"
            :disabled="readOnly"
            @update:model-value="emit('update:resizable', $event)"
          />
          <Label>Resizable</Label>
        </div>
      </div>

      <!-- Read-only -->
      <div class="flex items-center gap-2">
        <Switch
          :model-value="readOnly"
          :disabled="readOnly"
          @update:model-value="emit('update:read-only', $event)"
        />
        <Label>Read-only</Label>
      </div>
    </CardContent>
  </Card>
</template>

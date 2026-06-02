<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Palette, Copy, Save, ArrowUpDown } from '@lucide/vue'
import ColorPalette from '@/components/ColorPalette.vue'

const props = defineProps<{
  arrowId: string | null
  arrowModel: any
  readOnly?: boolean
}>()

const emit = defineEmits({
  'update:body-type': (value: 'curve' | 'line') => true,
  'update:body-style': (value: string) => true,
  'update:source-head': (value: string) => true,
  'update:target-head': (value: string) => true,
  'update:source-anchor': (value: string) => true,
  'update:target-anchor': (value: string) => true,
  'update:color': (value: string) => true,
  'update:color-inherit': (value: boolean) => true,
  'update:read-only': (value: boolean) => true,
  'swap-arrowheads': () => true,
  'copy-link': () => true,
  'set-as-default': () => true,
})

const bodyType = computed(() => props.arrowModel?.bodyType?.value ?? 'curve')
const bodyStyle = computed(() => props.arrowModel?.bodyStyle?.value ?? 'solid')
const sourceHead = computed(() => props.arrowModel?.sourceHead?.value ?? 'none')
const targetHead = computed(() => props.arrowModel?.targetHead?.value ?? 'open')
const sourceAnchor = computed(() => {
  const v = props.arrowModel?.sourceAnchor?.value
  if (v == null) return 'null'
  return JSON.stringify(v)
})
const targetAnchor = computed(() => {
  const v = props.arrowModel?.targetAnchor?.value
  if (v == null) return 'null'
  return JSON.stringify(v)
})
const color = computed(() => (props.arrowModel?.color?.value as string) ?? 'grey')
const colorInherit = computed(() => props.arrowModel?.color?.inherit?.value ?? false)
const readOnlyArrow = computed(() => props.arrowModel?.readOnly?.value ?? false)
const createdAt = computed(() => props.arrowModel?.createdAt?.value ?? null)
const editedAt = computed(() => props.arrowModel?.editedAt?.value ?? null)

function formatTimestamp(ts: number | null): string {
  if (ts == null) return ''
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
}

const anchorOptions = [
  { label: 'Auto', value: 'null' },
  { label: 'Left', value: JSON.stringify({ x: -1, y: 0 }) },
  { label: 'Top', value: JSON.stringify({ x: 0, y: -1 }) },
  { label: 'Right', value: JSON.stringify({ x: 1, y: 0 }) },
  { label: 'Bottom', value: JSON.stringify({ x: 0, y: 1 }) },
]

function handleColorSelect(colorName: string) {
  emit('update:color', colorName)
  emit('update:color-inherit', false)
}
</script>

<template>
  <Card v-if="arrowId" data-testid="arrow-properties-card">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm">Arrow Properties</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 text-xs">
      <!-- Body Type -->
      <div class="space-y-2">
        <Label>Body Type</Label>
        <Select
          :model-value="bodyType"
          :disabled="readOnly"
          @update:model-value="emit('update:body-type', $event as 'curve' | 'line')"
        >
          <SelectTrigger class="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="curve">Curve</SelectItem>
            <SelectItem value="line">Line</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Arrow Heads -->
      <div class="space-y-2">
        <Label>Arrow Heads</Label>
        <div class="flex gap-2">
          <div class="flex-1">
            <Select
              :model-value="sourceHead"
              :disabled="readOnly"
              @update:model-value="emit('update:source-head', $event as string)"
            >
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex-1">
            <Select
              :model-value="targetHead"
              :disabled="readOnly"
              @update:model-value="emit('update:target-head', $event as string)"
            >
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Swap arrowheads -->
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        :disabled="readOnly"
        @click="emit('swap-arrowheads')"
      >
        <ArrowUpDown class="h-3 w-3 mr-2" />
        Swap arrowheads
      </Button>

      <!-- Anchors -->
      <div class="space-y-2">
        <Label>Anchors</Label>
        <div class="flex gap-2">
          <div class="flex-1">
            <Select
              :model-value="sourceAnchor"
              :disabled="readOnly"
              @update:model-value="emit('update:source-anchor', $event as string)"
            >
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in anchorOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex-1">
            <Select
              :model-value="targetAnchor"
              :disabled="readOnly"
              @update:model-value="emit('update:target-anchor', $event as string)"
            >
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in anchorOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Body Style -->
      <div class="space-y-2">
        <Label>Body Style</Label>
        <Select
          :model-value="bodyStyle"
          :disabled="readOnly"
          @update:model-value="emit('update:body-style', $event as string)"
        >
          <SelectTrigger class="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
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
              @update:model-value="emit('update:color-inherit', Boolean($event))"
            />
            <Label class="text-[10px]">Inherit</Label>
          </div>
        </div>
        <div class="flex justify-center">
          <ColorPalette
            type="arrows"
            orientation="horizontal"
            :split="2"
            :model-value="color"
            :disabled="readOnly || colorInherit"
            @update:model-value="handleColorSelect($event as string)"
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
          Copy link to this arrow
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          :disabled="readOnly"
          @click="emit('set-as-default')"
        >
          <Save class="h-3 w-3 mr-2" />
          Set as default arrow style
        </Button>
      </div>

      <!-- Timestamps -->
      <div v-if="createdAt || editedAt" class="space-y-1 text-[11px] text-muted-foreground">
        <div v-if="createdAt">
          <span class="font-medium text-foreground">Created:</span> {{ formatTimestamp(createdAt) }}
        </div>
        <div v-if="editedAt">
          <span class="font-medium text-foreground">Edited:</span> {{ formatTimestamp(editedAt) }}
        </div>
      </div>

      <!-- Read-only -->
      <div class="flex items-center gap-2">
        <Switch
          :model-value="readOnlyArrow"
          :disabled="readOnly"
          @update:model-value="emit('update:read-only', Boolean($event))"
        />
        <Label>Read-only</Label>
      </div>
    </CardContent>
  </Card>
</template>

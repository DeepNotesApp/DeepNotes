<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Palette, Copy, Save, ArrowUpDown } from 'lucide-vue-next'

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
  'update:color': (value: number) => true,
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
const color = computed(() => props.arrowModel?.color?.value ?? 0)
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

const colors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function handleColorSelect(colorIndex: number) {
  emit('update:color', colorIndex)
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
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :class="{ 'bg-primary text-primary-foreground': bodyType === 'curve' }"
            :disabled="readOnly"
            @click="emit('update:body-type', 'curve')"
          >
            Curve
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :class="{ 'bg-primary text-primary-foreground': bodyType === 'line' }"
            :disabled="readOnly"
            @click="emit('update:body-type', 'line')"
          >
            Line
          </Button>
        </div>
      </div>

      <!-- Arrow Heads -->
      <div class="space-y-2">
        <Label>Arrow Heads</Label>
        <div class="flex gap-2">
          <div class="flex-1">
            <select
              :value="sourceHead"
              class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              :disabled="readOnly"
              @change="emit('update:source-head', ($event.target as HTMLSelectElement).value)"
            >
              <option value="none">None</option>
              <option value="open">Open</option>
            </select>
          </div>
          <div class="flex-1">
            <select
              :value="targetHead"
              class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              :disabled="readOnly"
              @change="emit('update:target-head', ($event.target as HTMLSelectElement).value)"
            >
              <option value="none">None</option>
              <option value="open">Open</option>
            </select>
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
            <select
              :value="sourceAnchor"
              class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              :disabled="readOnly"
              @change="emit('update:source-anchor', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in anchorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="flex-1">
            <select
              :value="targetAnchor"
              class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              :disabled="readOnly"
              @change="emit('update:target-anchor', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in anchorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Body Style -->
      <div class="space-y-2">
        <Label>Body Style</Label>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :class="{ 'bg-primary text-primary-foreground': bodyStyle === 'solid' }"
            :disabled="readOnly"
            @click="emit('update:body-style', 'solid')"
          >
            Solid
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :class="{ 'bg-primary text-primary-foreground': bodyStyle === 'dashed' }"
            :disabled="readOnly"
            @click="emit('update:body-style', 'dashed')"
          >
            Dashed
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            :class="{ 'bg-primary text-primary-foreground': bodyStyle === 'dotted' }"
            :disabled="readOnly"
            @click="emit('update:body-style', 'dotted')"
          >
            Dotted
          </Button>
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
              @update:model-value="emit('update:color-inherit', Boolean($event))"
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

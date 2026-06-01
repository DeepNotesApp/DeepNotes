<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Palette } from 'lucide-vue-next'

const props = defineProps<{
  arrowId: string | null
  arrowModel: any
  readOnly?: boolean
}>()

const emit = defineEmits({
  'update:body-type': (value: 'curve' | 'line') => true,
  'update:body-style': (value: string) => true,
  'update:source-head': (value: boolean) => true,
  'update:target-head': (value: boolean) => true,
  'update:color': (value: number) => true,
  'update:color-inherit': (value: boolean) => true,
  'update:read-only': (value: boolean) => true,
})

const bodyType = computed(() => props.arrowModel?.bodyType?.value ?? 'curve')
const bodyStyle = computed(() => props.arrowModel?.bodyStyle?.value ?? 'solid')
const sourceHead = computed(() => props.arrowModel?.sourceHead?.value ?? false)
const targetHead = computed(() => props.arrowModel?.targetHead?.value ?? true)
const color = computed(() => props.arrowModel?.color?.value ?? 0)
const colorInherit = computed(() => props.arrowModel?.color?.inherit?.value ?? false)
const readOnlyArrow = computed(() => props.arrowModel?.readOnly?.value ?? false)

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
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <Switch
              :model-value="sourceHead"
              :disabled="readOnly"
              @update:model-value="emit('update:source-head', Boolean($event))"
            />
            <Label>Source</Label>
          </div>
          <div class="flex items-center gap-2">
            <Switch
              :model-value="targetHead"
              :disabled="readOnly"
              @update:model-value="emit('update:target-head', Boolean($event))"
            />
            <Label>Target</Label>
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

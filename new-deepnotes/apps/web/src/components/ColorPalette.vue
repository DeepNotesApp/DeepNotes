<script setup lang="ts">
import { computed } from 'vue'

export type ColorName =
  | 'grey'
  | 'red'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'sky'
  | 'blue'
  | 'violet'
  | 'purple'
  | 'pink'

const props = defineProps<{
  type: 'notes' | 'arrows'
  orientation?: 'horizontal' | 'vertical'
  split?: number
  modelValue: ColorName | string | number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ColorName]
}>()

const allColors: ColorName[] = [
  'grey',
  'red',
  'brown',
  'orange',
  'yellow',
  'green',
  'teal',
  'sky',
  'blue',
  'violet',
  'purple',
  'pink',
]

const colorMap: Record<'ui' | 'arrows' | 'notes', Record<ColorName, string>> = {
  ui: {
    grey: '#616161',
    red: '#AA0E0E',
    brown: '#7E3207',
    orange: '#AF5400',
    yellow: '#C29800',
    green: '#18990D',
    teal: '#00959E',
    sky: '#0284C7',
    blue: '#1135B6',
    violet: '#5E00D6',
    purple: '#7E22CE',
    pink: '#9C00B6',
  },
  arrows: {
    grey: '#858585',
    red: '#B80909',
    brown: '#81370E',
    orange: '#CC6200',
    yellow: '#C19700',
    green: '#13A906',
    teal: '#14B8A6',
    sky: '#0EA5E9',
    blue: '#1D4ED8',
    violet: '#7F2DFF',
    purple: '#9C29FF',
    pink: '#C91CDA',
  },
  notes: {
    grey: '#2F2F2F',
    red: '#6C1313',
    brown: '#542D11',
    orange: '#7B2F07',
    yellow: '#776109',
    green: '#0E5428',
    teal: '#08564E',
    sky: '#065072',
    blue: '#102C7A',
    violet: '#3E177A',
    purple: '#4B1972',
    pink: '#61116B',
  },
}

const paletteType = computed<'notes' | 'arrows' | 'ui'>(() => props.type)

const groupLength = computed(() =>
  Math.ceil(allColors.length / (props.split ?? 1)),
)

const numGroups = computed(() =>
  Math.ceil(allColors.length / groupLength.value),
)

const isHorizontal = computed(() => props.orientation === 'horizontal')

function resolveColorName(value: ColorName | string | number): ColorName {
  if (typeof value === 'number') {
    return allColors[value % allColors.length] ?? 'grey'
  }
  const str = String(value ?? '')
  if (allColors.includes(str as ColorName)) {
    return str as ColorName
  }
  // Fallback: try to find by hex match
  const typeMap = colorMap[paletteType.value]
  const matched = Object.entries(typeMap).find(
    ([, hex]) => hex.toLowerCase() === str.toLowerCase(),
  )
  return (matched?.[0] as ColorName) ?? 'grey'
}

const selectedColor = computed(() => resolveColorName(props.modelValue))

function select(color: ColorName) {
  if (!props.disabled) {
    emit('update:modelValue', color)
  }
}
</script>

<template>
  <div
    class="inline-flex cursor-pointer overflow-hidden rounded"
    :class="[
      isHorizontal ? 'flex-col' : 'flex-row',
    ]"
    :style="{
      width: isHorizontal ? '160px' : '44px',
    }"
  >
    <div
      v-for="groupIndex in numGroups"
      :key="groupIndex"
      class="flex flex-1"
      :class="[
        isHorizontal ? 'flex-row' : 'flex-col',
      ]"
    >
      <button
        v-for="cellIndex in groupLength"
        :key="cellIndex"
        type="button"
        class="flex-1 aspect-square transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring"
        :disabled="disabled"
        :style="{
          backgroundColor:
            allColors[(groupIndex - 1) * groupLength + cellIndex - 1] != null
              ? colorMap[paletteType][
                  allColors[(groupIndex - 1) * groupLength + cellIndex - 1]!
                ]
              : 'transparent',
          opacity:
            allColors[(groupIndex - 1) * groupLength + cellIndex - 1] ===
            selectedColor
              ? 1
              : 0.85,
          boxShadow:
            allColors[(groupIndex - 1) * groupLength + cellIndex - 1] ===
            selectedColor
              ? 'inset 0 0 0 2px #fff'
              : 'none',
        }"
        @click="
          () => {
            const c = allColors[(groupIndex - 1) * groupLength + cellIndex - 1]
            if (c) select(c)
          }
        "
      />
    </div>
  </div>
</template>

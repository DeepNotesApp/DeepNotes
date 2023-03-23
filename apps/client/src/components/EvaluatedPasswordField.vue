<template>
  <PasswordField
    ref="passwordRef"
    v-bind="$attrs"
    :model-value="modelValue"
    :autocomplete="autocomplete"
    @update:model-value="$emit('update:modelValue', $event)"
    @focus="focused = true"
    @blur="focused = false"
  >
    <div
      v-if="modelValue !== '' || focused"
      style="
        position: absolute;
        left: -12px;
        bottom: 0;
        height: 2px;
        isolation: isolate;
      "
      :style="{
        width: `${((passwordStrength + 1) / 5) * passwordWidth}px`,
        'background-color':
          passwordStrength === 0
            ? '#f95e68'
            : passwordStrength === 1
            ? '#fb964d'
            : passwordStrength === 2
            ? '#fdd244'
            : passwordStrength === 3
            ? '#b0dc53'
            : '#35cc62',
      }"
    ></div>
  </PasswordField>

  <template v-if="modelValue !== '' || focused">
    <ul
      v-if="passwordWarning || passwordFeedback.length > 0"
      style="
        padding-left: 30px;
        margin-block-start: 10px;
        margin-block-end: 2px;
      "
    >
      <li
        v-if="passwordWarning"
        style="color: #ff4040"
      >
        {{ passwordWarning }}
      </li>
      <li
        v-for="feedback in passwordFeedback"
        :key="feedback"
        style="color: #d0d0d0"
      >
        {{ feedback }}
      </li>
    </ul>
  </template>
</template>

<script setup lang="ts">
import { zxcvbn } from '@zxcvbn-ts/core';
import { useResizeObserver } from 'src/code/utils';
import type { ComponentPublicInstance } from 'vue';

const props = defineProps<{
  modelValue: string;
  autocomplete: 'current-password' | 'new-password';
}>();

const focused = ref(false);

const passwordRef = ref<ComponentPublicInstance>();
const passwordWidth = ref(0);

useResizeObserver(
  () => passwordRef.value!.$el,
  (entry) => {
    passwordWidth.value = entry.contentRect.width;
  },
);

const passwordStrength = ref(0);
const passwordFeedback = ref<string[]>([]);
const passwordWarning = ref('');

watchEffect(() => {
  const zxcvbnResult = zxcvbn(props.modelValue);

  passwordStrength.value = zxcvbnResult.score;
  passwordFeedback.value = zxcvbnResult.feedback.suggestions;
  passwordWarning.value = zxcvbnResult.feedback.warning;
});
</script>

<style scoped lang="scss">
.q-field :deep() {
  .q-field__control:before {
    border-bottom: 0;
  }

  .q-field__control:after {
    height: 0px;
  }
}
</style>

<template>
  <button
    style="
      background-color: transparent;

      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;

      padding: 2px;

      display: flex;

      cursor: pointer;

      color: inherit;

      position: relative;
    "
    @click="
      $emit(
        'update:modelValue',
        modelValue === 'monthly' ? 'yearly' : 'monthly',
      )
    "
  >
    <div
      style="
        position: absolute;

        border-radius: 6px;

        background-color: rgba(255, 255, 255, 0.2);

        left: 2px;
        top: 2px;
        right: 50%;
        bottom: 2px;

        transition: left 0.2s, right 0.2s;
      "
      :style="{
        left: modelValue === 'monthly' ? '2px' : '50%',
        right: modelValue === 'monthly' ? '50%' : '2px',
      }"
    ></div>

    <div class="button">Monthly</div>
    <div
      class="button"
      style="position: relative"
    >
      Yearly

      <div
        style="
          position: absolute;

          left: 50%;
          top: -8px;

          transform: translate(-50%, -100%);

          padding: 0 8px;

          border-radius: 4px;
          background-color: #006dd2;

          font-size: 12px;
          font-weight: bold;

          white-space: nowrap;

          white-space: nowrap;
        "
      >
        Save 20%

        <div
          style="
            position: absolute;

            width: 0;
            height: 0;

            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 8px solid #006dd2;

            left: 50%;
            transform: translateX(-50%);
          "
        ></div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'monthly' | 'yearly';
}>();

defineEmits(['update:modelValue']);
</script>

<style scoped>
.button {
  padding: 4px;
  width: 100px;
  border-radius: 6px;
  text-align: center;
}
</style>

<template>
  <div
    class="col-12 col-md-4"
    style="margin-bottom: 56px; max-width: 230px; display: flex"
  >
    <div
      style="
        flex: 1;

        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <div
        style="
          height: 120px;
          display: flex;
          justify-content: center;
          align-items: center;
        "
      >
        <slot></slot>
      </div>

      <Gap style="height: 24px" />

      <DeepBtn
        label="Download"
        color="primary"
        style="width: 150px; font-weight: bold"
        :href="url"
        :disable="disable"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  url?: string;
  disable?: boolean;
}>();
</script>

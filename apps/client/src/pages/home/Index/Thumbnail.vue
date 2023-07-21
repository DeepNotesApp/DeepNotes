<template>
  <div class="highlight-cell col-12 col-sm-6 col-lg-4 col-xl-3">
    <a
      class="highlight"
      :style="{ 'background-image': `url('${thumbnailImage}')` }"
      :href="href"
      target="_blank"
    >
      <div class="highlight-text">
        <div
          v-if="date != null"
          class="highlight-date"
        >
          {{
            Intl.DateTimeFormat('en', {
              dateStyle: 'medium',
            }).format(date)
          }}
        </div>

        <div class="highlight-title">{{ title }}</div>

        <slot></slot>
      </div>

      <div class="highlight-overlay"></div>
    </a>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  thumbnailImage: string;
  date?: Date;
  title: string;
  href?: string;
}>();
</script>

<style scoped>
.highlight-cell {
  height: 256px !important;
  display: flex;
}
.highlight {
  flex: 1;
  margin: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;

  background-size: contain;
  background-position: center center;
  background-repeat: no-repeat;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  position: relative;
  overflow: hidden;
}
.highlight-text {
  background-color: rgba(0, 0, 0, 0.4);
  padding: 12px;
}
.highlight-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
.highlight-title {
  font-size: 15px;
  font-weight: bold;
  color: white;
}
.highlight-overlay {
  position: absolute;

  left: 0;
  top: 0;
  width: 100%;
  height: 100%;

  pointer-events: none;
}
.highlight:hover > .highlight-overlay {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>

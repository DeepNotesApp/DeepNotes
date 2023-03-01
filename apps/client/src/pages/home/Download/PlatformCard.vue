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
        v-if="options == null"
        label="Download"
        color="primary"
        style="width: 150px"
      />
      <q-btn-dropdown
        v-else
        label="Download"
        color="primary"
        style="width: 150px"
        split
      >
        <q-list style="background-color: #2b89e6">
          <q-item
            v-for="option in options"
            :key="option.name"
            clickable
            v-close-popup
          >
            <q-item-section avatar>
              <q-icon name="mdi-download" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ option.name }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  options?: {
    name: string;
    url: string;
  }[];
}>();
</script>

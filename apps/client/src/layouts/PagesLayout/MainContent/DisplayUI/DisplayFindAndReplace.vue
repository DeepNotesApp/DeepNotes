<template>
  <div
    v-if="page.findAndReplace.react.active"
    style="position: absolute; right: 64px; top: 16px"
  >
    <div
      style="
        border-radius: 4px;
        padding: 8px;
        background-color: #404040;
        pointer-events: auto;

        display: flex;
        flex-direction: column;
      "
    >
      <div style="display: flex">
        <div style="display: flex; flex-direction: column">
          <TextField
            dense
            placeholder="Find"
            style="font-size: 13px; width: 140px"
            v-model="find"
            autofocus
          />

          <template v-if="page.findAndReplace.react.replace">
            <Gap style="height: 8px" />

            <TextField
              dense
              placeholder="Replace"
              style="font-size: 13px; width: 140px"
              v-model="replacement"
            />
          </template>
        </div>

        <div style="display: flex; flex-direction: column">
          <div style="display: flex">
            <Gap style="width: 4px" />

            <DisplayBtn
              icon="mdi-arrow-down"
              size="12px"
              color="grey-8"
              :btn-size="32"
              @click="page.findAndReplace.findNext()"
            >
              <q-tooltip
                anchor="bottom middle"
                self="top middle"
                transition-show="jump-down"
                transition-hide="jump-up"
              >
                Find next
              </q-tooltip>
            </DisplayBtn>

            <Gap style="width: 4px" />

            <DisplayBtn
              icon="mdi-arrow-up"
              size="12px"
              color="grey-8"
              :btn-size="32"
              @click="page.findAndReplace.findPrev()"
            >
              <q-tooltip
                anchor="bottom middle"
                self="top middle"
                transition-show="jump-down"
                transition-hide="jump-up"
              >
                Find previous
              </q-tooltip>
            </DisplayBtn>
          </div>

          <template v-if="page.findAndReplace.react.replace">
            <Gap style="height: 8px" />

            <div style="display: flex">
              <Gap style="width: 4px" />

              <DisplayBtn
                icon="mdi-file-find-outline"
                size="12px"
                color="grey-8"
                :btn-size="32"
                @click="page.findAndReplace.replace(replacement)"
              >
                <q-tooltip
                  anchor="bottom middle"
                  self="top middle"
                  transition-show="jump-down"
                  transition-hide="jump-up"
                >
                  Replace
                </q-tooltip>
              </DisplayBtn>

              <Gap style="width: 4px" />

              <DisplayBtn
                icon="mdi-find-replace"
                size="12px"
                color="grey-8"
                :btn-size="32"
                @click="page.findAndReplace.replaceAll(replacement)"
              >
                <q-tooltip
                  anchor="bottom middle"
                  self="top middle"
                  transition-show="jump-down"
                  transition-hide="jump-up"
                >
                  Replace all
                </q-tooltip>
              </DisplayBtn>
            </div>
          </template>
        </div>
      </div>

      <Gap style="height: 8px" />

      <div style="font-size: 12px; color: limegreen">
        {{ page.findAndReplace.react.resultCount }} results
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const find = ref('');
const replacement = ref('');
</script>

<script setup lang="ts">
const page = computed(() => internals.pages.react.page);

watch(
  [() => page.value.findAndReplace.react.active, find, replacement],
  async () => {
    page.value.findAndReplace.collectElems();
    await page.value.findAndReplace.updateSearch(find.value);
  },
);
</script>

<style lang="scss" scoped>
.q-input :deep() {
  .q-field__control {
    height: 34px;
  }
}
</style>

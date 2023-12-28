<template>
  <div style="padding: 20px; display: flex; flex-direction: column">
    Backlinks:

    <Gap style="height: 8px" />

    <q-list
      style="
        border-radius: 6px;
        height: 220px;
        background-color: #383838;
        overflow: auto;
      "
    >
      <q-item
        v-if="backlinks.length === 0"
        style="color: #b0b0b0"
      >
        <q-item-section>
          <q-item-label>No backlinks available</q-item-label>
        </q-item-section>
      </q-item>

      <div
        v-for="backlinkPageId in backlinks"
        :key="backlinkPageId"
      >
        <PageItem
          :icon="false"
          :page-id="backlinkPageId"
          prefer="absolute"
          @click="
            internals.pages.goToPage(backlinkPageId, { fromParent: true })
          "
          style="padding-right: 8px"
        >
          <q-item-section side>
            <PagePopupOptions
              :page-id="backlinkPageId"
              :menu-props="{ anchor: 'bottom right', self: 'top right' }"
            >
              <q-item
                clickable
                v-ripple
                @click="deleteBacklink(backlinkPageId)"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-trash-can" />
                </q-item-section>

                <q-item-section>
                  <q-item-label>Delete backlink</q-item-label>
                </q-item-section>
              </q-item>
            </PagePopupOptions>
          </q-item-section>
        </PageItem>
      </div>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import { handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

const backlinks = computed(
  (): string[] =>
    page.value.realtimeCtx.hget('page-backlinks', page.value.id, 'list') ?? [],
);

async function deleteBacklink(backlinkPageId: string) {
  try {
    await trpcClient.pages.backlinks.delete.mutate({
      sourcePageId: backlinkPageId,
      targetPageId: page.value.id,
    });

    $quasar().notify({
      message: 'Backlink deleted successfully.',
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}
</script>

<style scoped lang="scss">
.group-name {
  color: #60b2ff;
}

.backlink {
  position: relative;

  > .menu-btn {
    position: absolute;

    top: 50%;
    right: -6px;

    transform: translate(-50%, -50%);

    min-width: 30px;
    min-height: 30px;
    width: 30px;
    height: 30px;
  }
}
</style>

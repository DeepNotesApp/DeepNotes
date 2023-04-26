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

      <q-item
        v-for="backlinkPageId in backlinks"
        :key="backlinkPageId"
        clickable
        @click="internals.pages.goToPage(backlinkPageId)"
      >
        <q-item-section>
          <q-item-label caption>
            {{
              groupNames()(
                realtimeCtx.hget('page', backlinkPageId, 'group-id'),
              ).get().text
            }}
          </q-item-label>

          <q-item-label>
            {{ getPageTitle(backlinkPageId, { prefer: 'absolute' }).text }}
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <DeepBtn
            icon="mdi-close"
            round
            flat
            style="min-width: 32px; min-height: 32px; width: 32px; height: 32px"
            @click.stop="deleteBacklink(backlinkPageId)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { groupNames } from 'src/code/pages/computed/group-names';
import type { Page } from 'src/code/pages/page/page';
import { getPageTitle } from 'src/code/pages/utils';
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

const backlinks = computed(
  (): string[] =>
    page.value.realtimeCtx.hget('page-backlinks', page.value.id, 'list') ?? [],
);

const realtimeCtx = useRealtimeContext();

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

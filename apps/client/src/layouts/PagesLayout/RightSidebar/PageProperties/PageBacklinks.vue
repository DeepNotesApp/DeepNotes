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
        v-for="pageId in backlinks"
        :key="pageId"
        clickable
        @click="internals.pages.goToPage(pageId)"
      >
        <q-item-section>
          <q-item-label caption>
            {{
              groupNames()(realtimeCtx.hget('page', pageId, 'group-id')).get()
                .text
            }}
          </q-item-label>

          <q-item-label>
            {{ getPageTitle(pageId, { prefer: 'absolute' }).text }}
          </q-item-label>
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
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

const backlinks = computed(
  (): string[] =>
    page.value.realtimeCtx.hget('page-backlinks', page.value.id, 'list') ?? [],
);

const realtimeCtx = useRealtimeContext();
</script>

<template>
  <Combobox
    label="Link URL"
    :disable="page.react.readOnly"
    :options="linkOptions"
    :model-value="modelValue"
  >
    <template #item="scope">
      <q-item-section>
        <q-item-label caption>
          {{
            groupNames()(
              realtimeCtx.hget(
                'page',
                splitStr(scope.opt.value, '/').at(-1)!,
                'group-id',
              ),
            ).get().text
          }}
        </q-item-label>

        <q-item-label>
          {{ scope.opt.label }}
        </q-item-label>
      </q-item-section>
    </template>
  </Combobox>
</template>

<script setup lang="ts">
import { splitStr } from '@stdlib/misc';
import { groupNames } from 'src/code/pages/computed/group-names';
import { getPageTitle } from 'src/code/pages/utils';
import { useRealtimeContext } from 'src/code/realtime/context';

import type { ComboboxProps } from './Combobox.vue';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends ComboboxProps {}

defineProps<Props>();

const page = computed(() => internals.pages.react.page);

const realtimeCtx = useRealtimeContext();

const linkOptions = computed(() =>
  internals.pages.react.recentPageIds
    .map((pageId) => {
      const groupId = realtimeCtx.hget('page', pageId, 'group-id');

      if (groupId == null) {
        return;
      }

      if (
        realtimeCtx.hget('group', groupId, 'permanent-deletion-date') != null ||
        realtimeCtx.hget('page', pageId, 'permanent-deletion-date') != null
      ) {
        return;
      }

      return {
        label: getPageTitle(pageId, { prefer: 'absolute' }).text,
        value: `/pages/${pageId}`,
      };
    })
    .filter((page) => page != null),
);
</script>

import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

export const pageGroupIds = once(() =>
  createSmartComputedDict({
    get: async (pageId) => {
      if (pageId == null) {
        return;
      }

      const groupId = await internals.realtime.globalCtx.hgetAsync(
        'page',
        pageId,
        'group-id',
      );

      return groupId;
    },

    defaultValue: undefined,
  }),
);

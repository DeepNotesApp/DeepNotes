import type { PageUpdate } from '@deeplib/data';
import { PageUpdateModel } from '@deeplib/db';
import { base64ToBytes } from '@stdlib/base64';
import { namedPromises } from '@stdlib/misc';
import { throttle } from 'lodash';
import { unpack } from 'msgpackr';

import { getRedis } from './data/redis';
import { flushPageUpdateBuffer } from './data/redis/flush-page-update-buffer';
import { mainLogger } from './logger';

const moduleLogger = mainLogger().sub('update-flushing.ts');

export const updateBufferPageIdsSet = new Set<string>();

export const flushPageUpdatesThrottled = throttle(
  async () => {
    try {
      // Load buffered page updates

      const updateBufferPageIdsArray = Array.from(updateBufferPageIdsSet);
      updateBufferPageIdsSet.clear();

      const msgpackUpdateBuffers = await namedPromises(
        updateBufferPageIdsArray,
        updateBufferPageIdsArray.map((pageId) =>
          getRedis().lrangeBuffer(`page-update-buffer:{${pageId}}`, 0, -1),
        ),
      );

      // Prepare page updates

      const pageUpdateModels: Partial<PageUpdateModel>[] = [];
      const pageUpdateIndexes: Record<string, number> = {};

      for (const [pageId, msgpackPageUpdates] of Object.entries(
        msgpackUpdateBuffers,
      )) {
        for (const msgpackPageUpdate of msgpackPageUpdates) {
          const [updateIndex, encryptedData] = unpack(
            msgpackPageUpdate,
          ) as PageUpdate;

          pageUpdateModels.push({
            page_id: pageId,
            index: updateIndex,
            encrypted_data: base64ToBytes(encryptedData),
          });

          pageUpdateIndexes[pageId] = updateIndex;
        }
      }

      if (pageUpdateModels.length === 0) {
        return;
      }

      // Insert page updates into database

      await PageUpdateModel.query()
        .insert(pageUpdateModels)
        .onConflict(['page_id', 'index'])
        .ignore();

      // Trim page update buffers

      await Promise.allSettled(
        updateBufferPageIdsArray.map((pageId) =>
          flushPageUpdateBuffer(pageId, pageUpdateIndexes[pageId]),
        ),
      );

      moduleLogger.info(`Flushed ${pageUpdateModels.length} updates`);
    } catch (error) {
      moduleLogger.error('Page update flushing error: %o', error);
    }
  },
  30000,
  { leading: false },
);

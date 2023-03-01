import { bytesToBase64 } from '@stdlib/base64';
import { DEFAULT_REMOTE_TTL } from '@stdlib/data';
import type { Result } from 'ioredis';
import {
  flushPageUpdatesThrottled,
  updateBufferPageIdsSet,
} from 'src/update-flushing';

import { getRedis } from '../redis';

declare module 'ioredis' {
  interface RedisCommander<Context> {
    bufferizePageUpdate(
      pageUpdateIndexKey: string,
      pageUpdateBufferKey: string,

      lastPageUpdateIndex: number | null,
      encryptedData: string,
    ): Result<number, Context>;
  }
}

getRedis().defineCommand('bufferizePageUpdate', {
  numberOfKeys: 2,

  lua: `
    if redis.call('exists', KEYS[1]) == 0 then
      local last_page_update_index = ARGV[1]

      if redis.call('exists', KEYS[2]) == 1 then
        local last_page_update = redis.call('lindex', KEYS[2], -1)
        last_page_update_index = cmsgpack.unpack(last_page_update)
      elseif last_page_update_index == "" then
        return
      end

      redis.call('setnx', KEYS[1], last_page_update_index)
    end

    local page_update_index = redis.call('incr', KEYS[1])
    redis.call('expire', KEYS[1], ${DEFAULT_REMOTE_TTL})

    local encrypted_data = ARGV[2]

    local page_update = { page_update_index, encrypted_data }

    redis.call('rpush', KEYS[2], cmsgpack.pack(page_update))

    return page_update_index
  `,
});

export async function bufferizePageUpdate(
  pageId: string,
  lastPageUpdateIndex: number | null,
  encryptedData: Uint8Array,
) {
  const pageUpdateIndex = await getRedis().bufferizePageUpdate(
    `page-update-index:{${pageId}}`,
    `page-update-buffer:{${pageId}}`,

    lastPageUpdateIndex,
    bytesToBase64(encryptedData),
  );

  updateBufferPageIdsSet.add(pageId);

  void flushPageUpdatesThrottled();

  return pageUpdateIndex;
}

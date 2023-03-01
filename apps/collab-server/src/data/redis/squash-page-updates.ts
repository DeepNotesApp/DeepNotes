import { bytesToBase64 } from '@stdlib/base64';
import type { Result } from 'ioredis';

import { getRedis } from '../redis';

declare module 'ioredis' {
  interface RedisCommander<Context> {
    squashPageUpdates(
      pageUpdatesKey: string,

      fullUpdateIndex: number,
      fullUpdateBase64: string,
    ): Result<string, Context>;
  }
}

getRedis().defineCommand('squashPageUpdates', {
  numberOfKeys: 1,

  lua: `
    local max_page_update_index = tonumber(ARGV[1])

    local cache_exists = redis.call('exists', KEYS[1])
    local page_updates_ttl = redis.call('ttl', KEYS[1])

    while true do
      local msgpack_page_update = redis.call('lindex', KEYS[1], 0)
      
      if msgpack_page_update == false then
        break
      end

      local page_update = cmsgpack.unpack(msgpack_page_update)
      local page_update_index = page_update[1]

      if page_update_index > max_page_update_index then
        break
      end

      redis.call('lpop', KEYS[1])
    end

    if cache_exists then
      redis.call('lpush', KEYS[1], cmsgpack.pack({ max_page_update_index, ARGV[2] }))
      redis.call('expire', KEYS[1], page_updates_ttl)
    end
  `,
});

export async function squashPageUpdates(
  pageId: string,
  fullUpdateIndex: number,
  fullUpdate: Uint8Array,
) {
  return await getRedis().squashPageUpdates(
    `page-update-cache:{${pageId}}`,

    fullUpdateIndex,
    bytesToBase64(fullUpdate),
  );
}

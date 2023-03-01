import type { Result } from 'ioredis';

import { getRedis } from '../redis';

declare module 'ioredis' {
  interface RedisCommander<Context> {
    flushPageUpdateBuffer(
      pageUpdateBufferKey: string,
      pageUpdatesKey: string,

      maxPageUpdateIndex: number,
    ): Result<string, Context>;
  }
}

getRedis().defineCommand('flushPageUpdateBuffer', {
  numberOfKeys: 2,

  lua: `
    local max_page_update_index = tonumber(ARGV[1])

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

      redis.call('rpushx', KEYS[2], msgpack_page_update)

      redis.call('lpop', KEYS[1])
    end
  `,
});

export async function flushPageUpdateBuffer(
  pageId: string,
  maxPageUpdateIndex: number,
) {
  return await getRedis().flushPageUpdateBuffer(
    `page-update-buffer:{${pageId}}`,
    `page-update-cache:{${pageId}}`,

    maxPageUpdateIndex,
  );
}

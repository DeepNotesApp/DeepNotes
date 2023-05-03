import { PageUpdateModel } from '@deeplib/db';
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import { DEFAULT_REMOTE_TTL } from '@stdlib/data';
import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { pack, unpack } from 'msgpackr';

export async function getAllPageUpdates(
  pageId: string,
  redis: Redis | Cluster,
): Promise<[number, Uint8Array][]> {
  const [updateCacheItems, updateBufferItems] = await Promise.all([
    redis.lrangeBuffer(`page-update-cache:{${pageId}}`, 0, -1),
    redis.lrangeBuffer(`page-update-buffer:{${pageId}}`, 0, -1),

    redis.expire(`page-update-cache:{${pageId}}`, DEFAULT_REMOTE_TTL),
  ]);

  const cachePageUpdates = updateCacheItems
    .map<[number, string]>((msgpackPageUpdate) => unpack(msgpackPageUpdate))
    .map<[number, Uint8Array]>((redisPageUpdate) => [
      redisPageUpdate[0],
      base64ToBytes(redisPageUpdate[1]),
    ]);

  const bufferPageUpdates = updateBufferItems
    .map<[number, string]>((msgpackPageUpdate) => unpack(msgpackPageUpdate))
    .map<[number, Uint8Array]>((redisPageUpdate) => [
      redisPageUpdate[0],
      base64ToBytes(redisPageUpdate[1]),
    ]);

  if (updateCacheItems.length > 0) {
    return cachePageUpdates
      .concat(bufferPageUpdates)
      .sort(([updateIndexA], [updateIndexB]) => updateIndexA - updateIndexB);
  }

  const dbPageUpdates = (
    await PageUpdateModel.query()
      .where('page_id', pageId)
      .orderBy('index')
      .select('index', 'encrypted_data')
  ).map<[number, Uint8Array]>((pageUpdate) => [
    parseInt(pageUpdate.index as any),
    pageUpdate.encrypted_data,
  ]);

  if (dbPageUpdates.length > 0) {
    await redis
      .multi()
      .del(`page-update-cache:{${pageId}}`)
      .rpush(
        `page-update-cache:{${pageId}}`,
        ...dbPageUpdates.map((pageUpdate) =>
          pack([pageUpdate[0], bytesToBase64(pageUpdate[1])]),
        ),
      )
      .expire(`page-update-cache:{${pageId}}`, DEFAULT_REMOTE_TTL)
      .exec();
  }

  return dbPageUpdates
    .concat(bufferPageUpdates)
    .sort(([updateIndexA], [updateIndexB]) => updateIndexA - updateIndexB);
}

import { PageUpdateModel } from '@deeplib/db';
import { bytesToBase64 } from '@stdlib/base64';
import { DEFAULT_REMOTE_TTL } from '@stdlib/data';
import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { pack, unpack } from 'msgpackr';

export type PageUpdate = [number, string];

export async function getAllPageUpdates(
  pageId: string,
  redis: Redis | Cluster,
): Promise<PageUpdate[]> {
  const [updateCacheItems, updateBufferItems] = await Promise.all([
    redis.lrangeBuffer(`page-update-cache:{${pageId}}`, 0, -1),
    redis.lrangeBuffer(`page-update-buffer:{${pageId}}`, 0, -1),

    redis.expire(`page-update-cache:{${pageId}}`, DEFAULT_REMOTE_TTL),
  ]);

  const cachePageUpdates = updateCacheItems.map<PageUpdate>(
    (msgpackPageUpdate) => unpack(msgpackPageUpdate),
  );

  const bufferPageUpdates = updateBufferItems.map<PageUpdate>(
    (msgpackPageUpdate) => unpack(msgpackPageUpdate),
  );

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
  ).map<PageUpdate>((pageUpdate) => [
    parseInt(pageUpdate.index as any),
    bytesToBase64(pageUpdate.encrypted_data),
  ]);

  if (dbPageUpdates.length > 0) {
    await redis
      .multi()
      .del(`page-update-cache:{${pageId}}`)
      .rpush(
        `page-update-cache:{${pageId}}`,
        ...dbPageUpdates.map((pageUpdate) => pack(pageUpdate)),
      )
      .expire(`page-update-cache:{${pageId}}`, DEFAULT_REMOTE_TTL)
      .exec();
  }

  return dbPageUpdates
    .concat(bufferPageUpdates)
    .sort(([updateIndexA], [updateIndexB]) => updateIndexA - updateIndexB);
}

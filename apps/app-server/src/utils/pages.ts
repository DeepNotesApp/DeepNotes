import { PageLinkModel } from '@deeplib/db';
import { once, pull } from 'lodash';
import type { dataAbstraction } from 'src/data/data-abstraction';
import { z } from 'zod';

export const pageCreationSchema = once(() =>
  z.object({
    pageEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
    pageEncryptedRelativeTitle: z.instanceof(Uint8Array),
    pageEncryptedAbsoluteTitle: z.instanceof(Uint8Array),
  }),
);

export const pageKeyRotationSchema = once(() =>
  pageCreationSchema().extend({
    pageEncryptedUpdate: z.instanceof(Uint8Array),
    pageEncryptedSnapshots: z.record(
      z.object({
        encryptedSymmetricKey: z.instanceof(Uint8Array),
        encryptedData: z.instanceof(Uint8Array),
      }),
    ),
  }),
);

export async function addPageBacklink(input: {
  targetPageId: string;
  sourcePageId: string;
  dataAbstraction: ReturnType<typeof dataAbstraction>;
}) {
  // Insert page link

  await PageLinkModel.query()
    .insert({
      target_page_id: input.targetPageId,
      source_page_id: input.sourcePageId,

      last_activity_date: new Date(),
    })
    .onConflict(['source_page_id', 'target_page_id'])
    .merge();

  // Update backlinks on cache

  const pageBacklinks: string[] = await input.dataAbstraction.hget(
    'page-backlinks',
    input.targetPageId,
    'list',
  );

  // Prepend source page ID to backlinks

  pull(pageBacklinks, input.sourcePageId);
  pageBacklinks.splice(0, 0, input.sourcePageId);

  while (pageBacklinks.length > 100) {
    pageBacklinks.pop();
  }

  // Update backlinks

  await input.dataAbstraction.hmset('page-backlinks', input.targetPageId, {
    list: pageBacklinks,
  });
}

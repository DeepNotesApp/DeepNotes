import type { dataHashes } from '@deeplib/data';
import type { DataAbstraction, DataTransaction } from '@stdlib/data';
import { pull } from 'lodash';

export async function bumpRecentItem(input: {
  userId: string;

  itemType: 'group' | 'page';
  itemId: string;

  dataAbstraction: DataAbstraction<typeof dataHashes>;
  dtrx?: DataTransaction;
}) {
  const recentItemIds: string[] = await input.dataAbstraction.hget(
    'user',
    input.userId,
    `recent-${input.itemType}-ids`,
  );

  // Prepend item ID to recent item IDs

  pull(recentItemIds, input.itemId);
  recentItemIds.splice(0, 0, input.itemId);

  while (recentItemIds.length > 50) {
    recentItemIds.pop();
  }

  // Update recent item IDs

  await input.dataAbstraction.patch(
    'user',
    input.userId,
    { [`recent_${input.itemType}_ids`]: recentItemIds },
    { dtrx: input.dtrx },
  );
}

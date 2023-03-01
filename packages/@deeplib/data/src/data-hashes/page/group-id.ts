import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const groupId: DataField<PageModel> = {
  cacheLocally: true, // For performance (Used a lot)
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['group_id'],
};

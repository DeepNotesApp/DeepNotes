import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const groupId: DataField<PageModel> = {
  cacheLocally: true, // Reason: Performance (Field is used frequently)
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['group_id'],
};

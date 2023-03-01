import type { SessionModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const userId: DataField<SessionModel> = {
  cacheLocally: true, // Never changes

  userGettable: () => true,

  columns: ['user_id'],
};

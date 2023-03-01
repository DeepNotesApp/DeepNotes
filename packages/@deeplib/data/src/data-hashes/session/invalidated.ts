import type { SessionModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const invalidated: DataField<SessionModel> = {
  cacheLocally: true, // For performance (Used a lot)

  columns: ['invalidated'],
};

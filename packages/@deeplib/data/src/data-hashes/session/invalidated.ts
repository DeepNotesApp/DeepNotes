import type { SessionModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const invalidated: DataField<SessionModel> = {
  cacheLocally: true, // Reason: Performance (Field is used frequently)

  columns: ['invalidated'],
};

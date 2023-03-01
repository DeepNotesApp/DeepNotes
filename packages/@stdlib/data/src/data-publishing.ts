import { nanoidToBytes, once } from '@stdlib/misc';
import { nanoid } from 'nanoid';

export const getSelfPublisherID = once(() => nanoid());
export const getSelfPublisherIdBytes = once(() =>
  nanoidToBytes(getSelfPublisherID()),
);

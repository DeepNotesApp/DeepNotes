import { once } from 'lodash';
import { z } from 'zod';

export const pageKeyRotationSchema = once(() =>
  z.object({
    pageEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
    pageEncryptedRelativeTitle: z.instanceof(Uint8Array),
    pageEncryptedAbsoluteTitle: z.instanceof(Uint8Array),
    pageEncryptedUpdate: z.instanceof(Uint8Array),
    pageEncryptedSnapshots: z.record(
      z.object({
        encryptedSymmetricKey: z.instanceof(Uint8Array),
        encryptedData: z.instanceof(Uint8Array),
      }),
    ),
  }),
);

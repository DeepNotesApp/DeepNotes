import { bytesToText, textToBytes } from '@stdlib/misc';
import { createSmartComputed } from '@stdlib/vue';
import { once } from 'lodash';

export const selfUserName = once(() =>
  createSmartComputed({
    get: async () => {
      const userEncryptedName = await internals.realtime.globalCtx.hgetAsync(
        'user',
        authStore().userId,
        'encrypted-name',
      );

      if (userEncryptedName == null) {
        return '';
      }

      return bytesToText(
        internals.symmetricKeyring.decrypt(userEncryptedName, {
          padding: true,
          associatedData: {
            context: 'UserName',
            userId: authStore().userId,
          },
        }),
      );
    },

    set: (value) => {
      internals.realtime.hset(
        'user',
        authStore().userId,
        'encrypted-name',
        internals.symmetricKeyring.encrypt(textToBytes(value), {
          padding: true,
          associatedData: {
            context: 'UserName',
            userId: authStore().userId,
          },
        }),
      );
    },
  }),
);

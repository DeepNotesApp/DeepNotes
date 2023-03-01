import { createSymmetricKeyring, DataLayer } from '@stdlib/crypto';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

const _moduleLogger = once(() => mainLogger().sub('groupInternalKeyrings'));

export const groupInternalKeyrings = once(() =>
  createSmartComputedDict({
    get: async (groupId) => {
      if (groupId == null) {
        _moduleLogger().info('No valid group ID');

        return;
      }

      // Get keyring bytes

      const accessKeyringBytes = await internals.realtime.globalCtx.hgetAsync(
        'group-member',
        `${groupId}:${authStore().userId}`,
        'encrypted-internal-keyring',
      );

      if (accessKeyringBytes == null) {
        return;
      }

      // Get the keyring

      let accessKeyring = createSymmetricKeyring(accessKeyringBytes);

      if (accessKeyring.topLayer === DataLayer.Asymmetric) {
        try {
          accessKeyring = accessKeyring.unwrapAsymmetric(
            internals.keyPair.privateKey,
          );
        } catch (error) {
          //
        }
      }

      // Return the keyring

      _moduleLogger().info(`${groupId}: Successfully unwrapped keyring`);

      return accessKeyring;
    },

    defaultValue: undefined,
  }),
);

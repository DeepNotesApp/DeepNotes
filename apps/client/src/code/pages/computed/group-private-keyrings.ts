import { createPrivateKeyring } from '@stdlib/crypto';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

import { groupInternalKeyrings } from './group-internal-keyrings';

const _moduleLogger = once(() => mainLogger.sub('groupPrivateKeyrings'));

export const groupPrivateKeyrings = once(() =>
  createSmartComputedDict({
    get: async (groupId) => {
      if (groupId == null) {
        _moduleLogger().info('No valid group ID');

        return;
      }

      const [groupInternalKeyring, encryptedPrivateKeyring] = await Promise.all(
        [
          groupInternalKeyrings()(groupId).getAsync(),

          internals.realtime.globalCtx.hgetAsync(
            'group',
            groupId,
            'encrypted-private-keyring',
          ),
        ],
      );

      if (groupInternalKeyring == null) {
        _moduleLogger().info(`${groupId}: No valid keyring found`);

        return;
      }

      if (!encryptedPrivateKeyring) {
        _moduleLogger().info(`${groupId}: No valid encrypted private key`);

        return;
      }

      try {
        return createPrivateKeyring(encryptedPrivateKeyring).unwrapSymmetric(
          groupInternalKeyring,
          {
            associatedData: {
              context: 'GroupPrivateKeyring',
              groupId,
            },
          },
        );
      } catch (error) {
        //
      }
    },

    defaultValue: undefined,
  }),
);

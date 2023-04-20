import type { SymmetricKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';
import { GROUP_CONTENT_KEYRING } from 'src/stores/pages';

import { groupAccessKeyrings } from './group-access-keyrings';

const _moduleLogger = once(() => mainLogger.sub('groupContentKeyrings'));

export const groupContentKeyrings = once(() =>
  createSmartComputedDict({
    get: async (groupId) => {
      if (groupId == null) {
        _moduleLogger().info('No valid group ID');

        return;
      }

      let groupContentKeyring: SymmetricKeyring | undefined =
        pagesStore().dict[`${GROUP_CONTENT_KEYRING}:${groupId}`];

      if (groupContentKeyring != null) {
        _moduleLogger().info(`${groupId}: keyring already wrapped`);

        delete pagesStore().dict[`${GROUP_CONTENT_KEYRING}:${groupId}`];

        return groupContentKeyring;
      }

      // Get keyring bytes

      const [groupContentKeyringBytes, accessKeyring] = await Promise.all([
        internals.realtime.globalCtx.hgetAsync(
          'group',
          groupId,
          'encrypted-content-keyring',
        ),

        groupAccessKeyrings()(groupId).getAsync(),
      ]);

      if (groupContentKeyringBytes == null) {
        return;
      }

      // Get the keyring

      groupContentKeyring = createSymmetricKeyring(groupContentKeyringBytes);

      if (
        groupContentKeyring.topLayer === DataLayer.Symmetric &&
        accessKeyring?.topLayer === DataLayer.Raw
      ) {
        try {
          groupContentKeyring = groupContentKeyring.unwrapSymmetric(
            accessKeyring,
            {
              associatedData: {
                context: 'GroupContentKeyring',
                groupId,
              },
            },
          );
        } catch (error) {
          //
        }
      }

      // Return the keyring

      _moduleLogger().info(`${groupId}: Successfully unwrapped keyring`);

      return groupContentKeyring;
    },

    defaultValue: undefined,
  }),
);

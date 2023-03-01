import { bytesToText, splitStr } from '@stdlib/misc';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

import { groupPrivateKeyrings } from './group-private-keyrings.client';

const _getLogger = mainLogger().sub('groupMemberNames.get');
const _setLogger = mainLogger().sub('groupMemberNames.set');

export const groupRequestNames = once(() =>
  createSmartComputedDict<
    string,
    {
      text: string;
      status: 'unknown' | 'encrypted' | 'success';
    }
  >({
    get: async (key) => {
      if (key == null) {
        _getLogger.info('No valid key');

        return { text: '[Unknown user]', status: 'unknown' };
      }

      const [groupId, userId] = splitStr(key, ':', 2);

      const isSelf = userId === authStore().userId;

      const [privateKeyring, encryptedName] = await Promise.all([
        groupPrivateKeyrings()(groupId).getAsync(),

        internals.realtime.globalCtx.hgetAsync(
          'group-join-request',
          key,
          isSelf ? 'encrypted-name-for-user' : 'encrypted-name',
        ),
      ]);

      if (encryptedName == null) {
        _getLogger.info(`${key}: No encrypted display name`);

        return { text: '[Unknown user]', status: 'unknown' };
      }

      if (groupId == null) {
        mainLogger().info(`${key}: No group ID found`);

        return { text: '[Encrypted name]', status: 'encrypted' };
      }

      try {
        let result;

        if (isSelf) {
          result = bytesToText(
            internals.symmetricKeyring.decrypt(encryptedName, {
              padding: true,
            }),
          );
        } else {
          if (privateKeyring == null) {
            _getLogger.info(`${key}: No group private key found`);

            return { text: '[Encrypted name]', status: 'encrypted' };
          }

          result = bytesToText(
            privateKeyring.decrypt(encryptedName, { padding: true }),
          );
        }

        _getLogger.info(`${key}: ${result}`);

        return { text: result, status: 'success' };
      } catch (error) {
        _getLogger.info(`${key}: Failed to decrypt page title`);

        return { text: '[Encrypted name]', status: 'success' };
      }
    },

    initialValue: { text: '[Unknown user]', status: 'unknown' },
  }),
);

import { hget } from '@deeplib/data/src/universal';
import { createKeyring } from '@stdlib/crypto';
import { bytesToText, splitStr, textToBytes } from '@stdlib/misc';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';
import { selfUserName } from 'src/code/self-user-name';

import { groupPrivateKeyrings } from './group-private-keyrings';

const _getLogger = mainLogger().sub('groupMemberNames.get');
const _setLogger = mainLogger().sub('groupMemberNames.set');

export const groupMemberNames = once(() =>
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

      const groupId = splitStr(key, ':', 2)[0];

      if (groupId === internals.personalGroupId) {
        const userName = await selfUserName().getAsync();

        return { text: userName, status: 'success' };
      }

      const [privateKeyring, encryptedName] = await Promise.all([
        groupPrivateKeyrings()(groupId).getAsync(),

        internals.realtime.globalCtx.mhgetCoalesceAsync([
          hget('group-member', key, 'encrypted-name'),
          hget('group-join-invitation', key, 'encrypted-name'),
          hget('group-join-request', key, 'encrypted-name'),
        ]),
      ]);

      if (encryptedName == null) {
        _getLogger.info(`${key}: No encrypted display name`);

        return { text: '[Unknown user]', status: 'unknown' };
      }

      if (groupId == null) {
        mainLogger().info(`${key}: No group ID found`);

        return { text: '[Encrypted name]', status: 'encrypted' };
      }

      if (privateKeyring == null) {
        _getLogger.info(`${key}: No group private key found`);

        return { text: '[Encrypted name]', status: 'encrypted' };
      }

      try {
        const result = bytesToText(
          privateKeyring.decrypt(encryptedName, { padding: true }),
        );

        _getLogger.info(`${key}: ${result}`);

        return { text: result, status: 'success' };
      } catch (error) {
        _getLogger.info(`${key}: Failed to decrypt page title`);

        return { text: '[Encrypted name]', status: 'success' };
      }
    },
    set: async (key, value: any) => {
      if (key == null) {
        _setLogger.info(`${key}: No valid key`);

        return;
      }

      const groupId = splitStr(key, ':', 2)[0];

      const publicKeyring = createKeyring(
        await internals.realtime.globalCtx.hgetAsync(
          'group',
          groupId,
          'public-keyring',
        ),
      );

      if (publicKeyring == null) {
        _setLogger.info(`${key}: No valid public key found`);

        return;
      }

      const encryptedName = internals.keyPair.encrypt(
        textToBytes(value),
        publicKeyring,
        { padding: true },
      );

      internals.realtime.hset(
        'group-member',
        key,
        'encrypted-name',
        encryptedName,
      );

      _setLogger.info(`${key}: ${value}`);
    },

    initialValue: { text: '[Unknown user]', status: 'unknown' },
  }),
);

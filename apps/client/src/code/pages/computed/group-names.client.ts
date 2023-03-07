import { bytesToText, textToBytes } from '@stdlib/misc';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

import { groupAccessKeyrings } from './group-access-keyrings.client';

const _getLogger = mainLogger().sub('groupNames.get');
const _setLogger = mainLogger().sub('groupNames.set');

export const groupNames = once(() =>
  createSmartComputedDict<
    string,
    {
      text: string;
      status: 'unknown' | 'encrypted' | 'success';
    }
  >({
    get: async (groupId) => {
      if (groupId == null) {
        _getLogger.info('No valid group ID');

        return { status: 'unknown', text: '[Unknown group]' };
      }

      if (groupId === internals.personalGroupId) {
        return { status: 'success', text: 'Personal group' };
      }

      const [accessKeyring, groupEncryptedName] = await Promise.all([
        groupAccessKeyrings()(groupId!).getAsync(),

        internals.realtime.globalCtx.hgetAsync(
          'group',
          groupId,
          'encrypted-name',
        ),
      ]);

      if (accessKeyring?.topLayer == null) {
        _getLogger.info(`${groupId}: No valid keyring found`);

        return { status: 'encrypted', text: `[Group ${groupId}]` };
      }

      if (groupEncryptedName == null) {
        _getLogger.info(`${groupId}: No valid encrypted group name received`);

        return { status: 'encrypted', text: `[Group ${groupId}]` };
      }

      try {
        const groupName = bytesToText(
          accessKeyring.decrypt(groupEncryptedName, {
            padding: true,
            associatedData: {
              context: 'GroupName',
              groupId,
            },
          }),
        );

        _getLogger.info(`${groupId}: ${groupName}`);

        return { status: 'success', text: groupName };
      } catch (error) {
        _getLogger.info(`${groupId}: Failed to decrypt group name`);

        return { status: 'success', text: `[Group ${groupId}]` };
      }
    },
    set: async (groupId, value: any) => {
      if (groupId == null) {
        _setLogger.info(`${groupId}: No valid group ID`);
        return;
      }

      const accessKeyring = await groupAccessKeyrings()(groupId!).getAsync();

      if (accessKeyring == null) {
        _setLogger.info(`${groupId}: No valid keyring found`);
        return;
      }

      const groupEncryptedName = accessKeyring.encrypt(textToBytes(value), {
        padding: true,
        associatedData: {
          context: 'GroupName',
          groupId,
        },
      });

      internals.realtime.hset(
        'group',
        groupId,
        'encrypted-name',
        groupEncryptedName,
      );

      _setLogger.info(`${groupId}: ${value}`);
    },

    initialValue: { status: 'unknown', text: '[Unknown group]' },
  }),
);

import { DataLayer } from '@stdlib/crypto';
import { bytesToText, textToBytes } from '@stdlib/misc';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

import { pageGroupIds } from './page-group-id';
import { pageKeyrings } from './page-keyrings';

const _getLogger = mainLogger().sub('pageRelativeTitles.get');
const _setLogger = mainLogger().sub('pageRelativeTitles.set');

export const pageRelativeTitles = once(() =>
  createSmartComputedDict<
    string,
    {
      text: string;
      status: 'unknown' | 'encrypted' | 'success';
    }
  >({
    get: (pageId) => {
      if (pageId == null) {
        _getLogger.info('No valid page ID');

        return { text: '[Unknown page]', status: 'unknown' };
      }

      const pageEncryptedRelativeTitle = internals.realtime.globalCtx.hget(
        'page',
        pageId,
        'encrypted-relative-title',
      );

      const groupId = pageGroupIds()(pageId).get();

      if (pageEncryptedRelativeTitle == null) {
        _getLogger.info(`${pageId}: No encrypted page title found`);

        return { text: `[Page ${pageId}]`, status: 'unknown' };
      }

      if (groupId == null) {
        mainLogger().info(`${pageId}: No group ID found`);

        return { text: `[Page ${pageId}]`, status: 'unknown' };
      }

      const pageKeyring = pageKeyrings()(`${groupId}:${pageId}`).get();

      if (pageKeyring?.topLayer !== DataLayer.Raw) {
        _getLogger.info(`${pageId}: No valid page keyring found`);

        return { text: '[Encrypted page]', status: 'encrypted' };
      }

      try {
        const result = bytesToText(
          pageKeyring.decrypt(pageEncryptedRelativeTitle, {
            padding: true,
            associatedData: {
              context: 'PageRelativeTitle',
              pageId,
            },
          }),
        );

        _getLogger.info(`${pageId}: ${result}`);

        return { text: result, status: 'success' };
      } catch (error) {
        _getLogger.info(`${pageId}: Failed to decrypt page title`);

        return { text: '[Failed to decrypt]', status: 'success' };
      }
    },
    set: async (pageId, value: any) => {
      if (pageId == null) {
        _setLogger.info(`${pageId}: No valid page ID`);

        return;
      }

      const groupId = await internals.realtime.globalCtx.hgetAsync(
        'page',
        pageId,
        'group-id',
      );

      if (groupId == null) {
        _setLogger.info(`${pageId}: No group ID found`);

        return;
      }

      const pageKeyring = await pageKeyrings()(
        `${groupId}:${pageId}`,
      ).getAsync();

      if (pageKeyring == null) {
        _setLogger.info(`${pageId}: No valid page keyring found`);

        return;
      }

      const pageEncryptedRelativeTitle = pageKeyring.encrypt(
        textToBytes(value),
        {
          padding: true,
          associatedData: {
            context: 'PageRelativeTitle',
            pageId,
          },
        },
      );

      internals.realtime.hset(
        'page',
        pageId,
        'encrypted-relative-title',
        pageEncryptedRelativeTitle,
      );

      _setLogger.info(`${pageId}: ${value}`);
    },

    initialValue: { text: '[Unknown page]', status: 'unknown' },
  }),
);

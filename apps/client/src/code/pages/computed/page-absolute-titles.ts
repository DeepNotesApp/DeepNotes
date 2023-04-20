import { DataLayer } from '@stdlib/crypto';
import { bytesToText, textToBytes } from '@stdlib/misc';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

import { pageGroupIds } from './page-group-id';
import { pageKeyrings } from './page-keyrings';

const _getLogger = mainLogger.sub('pageAbsoluteTitles.get');
const _setLogger = mainLogger.sub('pageAbsoluteTitles.set');

export const pageAbsoluteTitles = once(() =>
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

      const pageEncryptedAbsoluteTitle = internals.realtime.globalCtx.hget(
        'page',
        pageId,
        'encrypted-absolute-title',
      );

      const groupId = pageGroupIds()(pageId).get();

      if (pageEncryptedAbsoluteTitle == null) {
        _getLogger.info(`${pageId}: No encrypted page title found`);

        return { text: `[Page ${pageId}]`, status: 'unknown' };
      }

      if (groupId == null) {
        mainLogger.info(`${pageId}: No group ID found`);

        return { text: `[Page ${pageId}]`, status: 'unknown' };
      }

      const pageKeyring = pageKeyrings()(`${groupId}:${pageId}`).get();

      if (pageKeyring?.topLayer !== DataLayer.Raw) {
        _getLogger.info(`${pageId}: No valid page keyring found`);

        return { text: '[Encrypted page]', status: 'encrypted' };
      }

      try {
        const pageAbsoluteTitle = bytesToText(
          pageKeyring.decrypt(pageEncryptedAbsoluteTitle, {
            padding: true,
            associatedData: {
              context: 'PageAbsoluteTitle',
              pageId,
            },
          }),
        );

        _getLogger.info(`${pageId}: ${pageAbsoluteTitle}`);

        return { text: pageAbsoluteTitle, status: 'success' };
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

      const pageEncryptedAbsoluteTitle = pageKeyring.encrypt(
        textToBytes(value),
        {
          padding: true,
          associatedData: {
            context: 'PageAbsoluteTitle',
            pageId,
          },
        },
      );

      internals.realtime.hset(
        'page',
        pageId,
        'encrypted-absolute-title',
        pageEncryptedAbsoluteTitle,
      );

      _setLogger.info(`${pageId}: ${value}`);
    },

    initialValue: { text: '[Unknown page]', status: 'unknown' },
  }),
);

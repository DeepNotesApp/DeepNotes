import { createSymmetricKeyring, DataLayer } from '@stdlib/crypto';
import { splitStr } from '@stdlib/misc';
import { createSmartComputedDict } from '@stdlib/vue';
import { once } from 'lodash';

import { groupContentKeyrings } from './group-content-keyrings';

export const pageKeyrings = once(() =>
  createSmartComputedDict({
    get: async (key) => {
      if (key == null) {
        return;
      }

      const [groupId, pageId] = splitStr(key, ':');

      // Get the page keyring

      const [groupContentKeyring, pageKeyringBytes] = await Promise.all([
        groupContentKeyrings()(groupId).getAsync(),

        internals.realtime.globalCtx.hgetAsync(
          'page',
          pageId,
          'encrypted-symmetric-keyring',
        ),
      ]);

      if (pageKeyringBytes == null) {
        return;
      }

      let pageKeyring = createSymmetricKeyring(pageKeyringBytes);

      // Try unwrapping the page keyring

      if (
        groupContentKeyring?.topLayer === DataLayer.Raw &&
        pageKeyring?.topLayer === DataLayer.Symmetric
      ) {
        try {
          pageKeyring = pageKeyring.unwrapSymmetric(groupContentKeyring, {
            associatedData: {
              context: 'PageKeyring',
              pageId,
            },
          });
        } catch (error) {
          //
        }
      }

      return pageKeyring;
    },

    defaultValue: undefined,
  }),
);

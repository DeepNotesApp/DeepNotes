import { insertPageSnapshot } from '@deeplib/data';
import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './save.controller';

@Injectable()
export class SaveService {
  async agentHasSufficientPermissions({ agentId, pageId }: EndpointValues) {
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    return await userHasPermission(agentId, groupId, 'editGroupPages');
  }

  async saveSnapshot({
    agentId,
    pageId,

    encryptedSymmetricKey,
    encryptedData,
    preRestore,

    dtrx,
  }: EndpointValues) {
    await insertPageSnapshot({
      dataAbstraction: dataAbstraction(),
      pageId,
      authorId: agentId,
      encryptedSymmetricKey: base64ToBytes(encryptedSymmetricKey),
      encryptedData: base64ToBytes(encryptedData),
      type: preRestore ? 'pre-restore' : 'manual',
      dtrx,
    });
  }
}

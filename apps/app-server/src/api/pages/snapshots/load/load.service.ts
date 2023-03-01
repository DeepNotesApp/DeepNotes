import { PageSnapshotModel } from '@deeplib/db';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { bytesToBase64 } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './load.controller';

@Injectable()
export class LoadService {
  async agentHasSufficientPermissions({ agentId, pageId }: EndpointValues) {
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    return await userHasPermission(agentId, groupId, 'editGroupPages');
  }

  async loadSnapshot({ snapshotId }: EndpointValues) {
    const snapshot = await PageSnapshotModel.query()
      .findById(snapshotId)
      .select('encrypted_symmetric_key', 'encrypted_data');

    if (snapshot == null) {
      throw new HttpException('Snapshot not found.', HttpStatus.NOT_FOUND);
    }

    return {
      encryptedSymmetricKey: bytesToBase64(snapshot.encrypted_symmetric_key),
      encryptedData: bytesToBase64(snapshot.encrypted_data),
    };
  }
}

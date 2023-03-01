import { PageSnapshotModel } from '@deeplib/db';
import type { PageSnapshotInfo } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { remove } from 'lodash';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './delete.controller';

@Injectable()
export class DeleteService {
  async agentHasSufficientPermissions({ agentId, groupId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupPages');
  }

  async deleteSnapshot({ pageId, snapshotId, signals, dtrx }: EndpointValues) {
    // Load page snapshot infos

    const pageSnapshotInfos: PageSnapshotInfo[] = await dataAbstraction().hget(
      'page-snaphots',
      pageId,
      'infos',
    );

    checkRedlockSignalAborted(signals);

    // Remove page snapshot

    await PageSnapshotModel.query(dtrx.trx).findById(snapshotId).delete();

    checkRedlockSignalAborted(signals);

    remove(
      pageSnapshotInfos,
      (pageSnapshotInfo) => pageSnapshotInfo.id === snapshotId,
    );

    // Update page snapshot infos

    await dataAbstraction().hmset(
      'page-snaphots',
      pageId,
      { infos: pageSnapshotInfos },
      { dtrx },
    );
  }
}

import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './restore.controller';

@Injectable()
export class RestoreService {
  async agentHasSufficientPermissions({ groupId, agentId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupSettings');
  }

  async restoreGroup({ groupId, dtrx }: EndpointValues) {
    await dataAbstraction().patch(
      'group',
      groupId,
      {
        permanent_deletion_date: null,
      },
      { dtrx },
    );
  }
}

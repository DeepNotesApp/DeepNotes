import { Injectable } from '@nestjs/common';
import { addMonths } from '@stdlib/misc';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './delete.controller';

@Injectable()
export class DeleteService {
  async agentHasSufficientPermissions({ groupId, agentId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupSettings');
  }

  async deleteGroup({ groupId, dtrx }: EndpointValues) {
    await dataAbstraction().patch(
      'group',
      groupId,
      {
        permanent_deletion_date: addMonths(new Date(), 1),
      },
      { dtrx },
    );
  }
}

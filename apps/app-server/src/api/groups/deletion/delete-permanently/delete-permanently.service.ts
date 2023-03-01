import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './delete-permanently.controller';

@Injectable()
export class DeletePermanentlyService {
  async agentHasSufficientPermissions({ groupId, agentId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupSettings');
  }

  async deleteGroupPermanently({ groupId, dtrx }: EndpointValues) {
    await dataAbstraction().patch(
      'group',
      groupId,
      {
        permanent_deletion_date: new Date(),
      },
      { dtrx },
    );
  }
}

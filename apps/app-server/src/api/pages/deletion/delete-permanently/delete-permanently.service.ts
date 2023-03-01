import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './delete-permanently.controller';

@Injectable()
export class DeletePermanentlyService {
  async agentHasSufficientPermissions({ pageId, agentId }: EndpointValues) {
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    return await userHasPermission(agentId, groupId, 'editGroupPages');
  }

  async isPageDeleted({ pageId }: EndpointValues) {
    const result = await dataAbstraction().hget(
      'page',
      pageId,
      'permanent-deletion-date',
    );

    return result;
  }

  async deletePagePermanently({ pageId }: EndpointValues) {
    await dataAbstraction().patch('page', pageId, {
      permanent_deletion_date: new Date(),
    });
  }
}

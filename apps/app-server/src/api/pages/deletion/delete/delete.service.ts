import { Injectable } from '@nestjs/common';
import { addMonths } from '@stdlib/misc';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './delete.controller';

@Injectable()
export class DeleteService {
  async agentHasSufficientPermissions({ agentId, pageId }: EndpointValues) {
    const pageGroupId = await dataAbstraction().hget(
      'page',
      pageId,
      'group-id',
    );

    return await userHasPermission(agentId, pageGroupId!, 'editGroupPages');
  }

  async isMainPage({ pageId }: EndpointValues) {
    const pageGroupId = await dataAbstraction().hget(
      'page',
      pageId,
      'group-id',
    );

    const mainPageId = await dataAbstraction().hget(
      'group',
      pageGroupId,
      'main-page-id',
    );

    return pageId === mainPageId;
  }

  async deletePage({ pageId }: EndpointValues) {
    await dataAbstraction().patch('page', pageId, {
      permanent_deletion_date: addMonths(new Date(), 1),
    });
  }
}

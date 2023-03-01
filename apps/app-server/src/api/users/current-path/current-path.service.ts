import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './current-path.controller';

@Injectable()
export class CurrentPathService {
  async initialPageExists({ initialPageId }: EndpointValues) {
    return (
      (await dataAbstraction().hget('page', initialPageId, 'group-id')) != null
    );
  }

  async getPathPageIds(values: EndpointValues): Promise<string[] | undefined> {
    const { userId, initialPageId } = values;

    const personalGroupId = await dataAbstraction().hget(
      'user',
      userId,
      'personal-group-id',
    );

    values.mainPageId = await dataAbstraction().hget(
      'group',
      personalGroupId!,
      'main-page-id',
    );

    const pathPageIds: string[] = [];

    const visitedPageIds = new Set();

    let pathPageId: string | null = initialPageId;

    while (pathPageId != null) {
      if (visitedPageIds.has(pathPageId)) {
        return;
      }

      visitedPageIds.add(pathPageId);

      pathPageIds.unshift(pathPageId);

      if (pathPageId === values.mainPageId) {
        return pathPageIds;
      }

      const lastParentId = (await dataAbstraction().hget(
        'user-page',
        `${userId}:${pathPageId}`,
        'last-parent-id',
      )) as any;

      pathPageId = lastParentId ?? null;
    }
  }

  async insertPageIntoLastPath({
    userId,
    initialPageId,
    mainPageId,
  }: EndpointValues) {
    const startingPageId = await dataAbstraction().hget(
      'user',
      userId,
      'starting-page-id',
    );

    if (initialPageId === startingPageId) {
      await dataAbstraction().patch('user-page', `${userId}:${initialPageId}`, {
        last_parent_id: mainPageId,
      });
    } else {
      await dataAbstraction().patch('user-page', `${userId}:${initialPageId}`, {
        last_parent_id: startingPageId,
      });
    }
  }
}

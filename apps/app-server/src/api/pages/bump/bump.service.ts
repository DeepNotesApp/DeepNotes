import { GroupMemberModel, PageLinkModel, PageModel } from '@deeplib/db';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { bumpRecentItem } from 'src/deep-utils';
import { mainLogger } from 'src/logger';

import type { EndpointValues } from './bump.controller';

@Injectable()
export class BumpService {
  async pageExists(pageId: string) {
    return (await dataAbstraction().hget('page', pageId, 'group-id')) != null;
  }

  async updateStartingPageId({ userId, pageId }: EndpointValues) {
    await dataAbstraction().patch('user', userId, { starting_page_id: pageId });
  }

  async updateLastParentId({ userId, pageId, parentPageId }: EndpointValues) {
    if (parentPageId == null) {
      return;
    }

    // Check for loop in parent chain

    const visitedPageIds = new Set<string>([pageId]);

    let loopCheckPageId: string | undefined = parentPageId;
    let rootPageId: string | undefined;

    while (loopCheckPageId != null) {
      if (visitedPageIds.has(loopCheckPageId)) {
        mainLogger()
          .sub('api/pages/bump')
          .info('Loop detected in parent chain');
        return;
      }

      visitedPageIds.add(loopCheckPageId);

      rootPageId = loopCheckPageId;

      loopCheckPageId =
        (await dataAbstraction().hget(
          'user-page',
          `${userId}:${loopCheckPageId}`,
          'last-parent-id',
        )) ?? undefined;
    }

    mainLogger().sub('api/pages/bump').info('No loop detected in parent chain');

    // Check that root page is personal group's main page

    const personalGroupId = await dataAbstraction().hget(
      'user',
      userId,
      'personal-group-id',
    );

    const mainPageId = await dataAbstraction().hget(
      'group',
      personalGroupId,
      'main-page-id',
    );

    if (rootPageId !== mainPageId) {
      throw new HttpException('Invalid parent page.', HttpStatus.BAD_REQUEST);
    }

    // Update last_parent_id

    await dataAbstraction().patch('user-page', `${userId}:${pageId}`, {
      last_parent_id: parentPageId ?? null,
    });
  }
  async updatePageLink({ userId, parentPageId, pageId }: EndpointValues) {
    if (parentPageId == null) {
      return;
    }

    try {
      await PageLinkModel.query()
        .insert({
          target_page_id: pageId,
          source_page_id: parentPageId,
          user_id: userId,

          last_activity_date: new Date(),
        })
        .onConflict(['user_id', 'source_page_id', 'target_page_id'])
        .merge();
    } catch (error) {
      // Ignore error: Page doesn't need to exist
    }
  }

  async updateRecentPageIds({ userId, pageId }: EndpointValues) {
    await bumpRecentItem(userId, 'page', pageId);
  }
  async updateRecentGroupIds({ userId, pageId }: EndpointValues) {
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    if (groupId == null) {
      return;
    }

    await bumpRecentItem(userId, 'group', groupId);
  }

  async updatePageLastActivityDate({ pageId }: EndpointValues) {
    try {
      await PageModel.query().findById(pageId).patch({
        last_activity_date: new Date(),
      });
    } catch (error) {
      // Ignore error: Page doesn't need to exist
    }
  }
  async updateGroupLastActivityDate({ userId, pageId }: EndpointValues) {
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    if (groupId == null) {
      return;
    }

    try {
      await GroupMemberModel.query().findById([groupId, userId]).patch({
        last_activity_date: new Date(),
      });
    } catch (error) {
      // Ignore error: Page doesn't need to exist
    }
  }
}

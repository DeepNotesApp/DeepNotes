import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { pull } from 'lodash';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

@Controller(':pageId')
export class RemoveRecentPageController {
  @Post()
  async handle(
    @Locals('userId') userId: string,
    @Param('pageId') pageId: string,
  ) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      const recentPageIds: string[] = await dataAbstraction().hget(
        'user',
        userId,
        'recent-page-ids',
      );

      checkRedlockSignalAborted(signals);

      if (pull(recentPageIds, pageId).length === 0) {
        throw new HttpException('Recent page not found.', HttpStatus.NOT_FOUND);
      }

      await dataAbstraction().patch('user', userId, {
        recent_page_ids: recentPageIds,
      });
    });
  }
}

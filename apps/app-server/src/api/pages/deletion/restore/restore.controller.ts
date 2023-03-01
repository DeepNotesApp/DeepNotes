import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import type { RedlockAbortSignal } from 'redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { RestoreService } from './restore.service';

export type EndpointValues = {
  agentId: string;
  pageId: string;
  signals: RedlockAbortSignal[];
};

@Controller()
export class RestoreController {
  constructor(private readonly endpointService: RestoreService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('pageId') pageId: string,
  ) {
    return await usingLocks([[`page-lock:${pageId}`]], async (signals) => {
      const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

      checkRedlockSignalAborted(signals);

      return await usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          const values: EndpointValues = { agentId, pageId, signals };

          if (
            !(await this.endpointService.agentHasSufficientPermissions(values))
          ) {
            throw new HttpException(
              'Insufficient permissions.',
              HttpStatus.FORBIDDEN,
            );
          }

          checkRedlockSignalAborted(signals);

          if (!(await this.endpointService.isPageDeleted(values))) {
            throw new HttpException(
              'This page is not deleted.',
              HttpStatus.NOT_FOUND,
            );
          }

          checkRedlockSignalAborted(signals);

          await this.endpointService.restorePage(values);
        },
        signals,
      );
    });
  }
}

import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { DeletePermanentlyService } from './delete-permanently.service';

export type EndpointValues = {
  agentId: string;
  pageId: string;
};

@Controller()
export class DeletePermanentlyController {
  constructor(private readonly endpointService: DeletePermanentlyService) {}

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
          const values: EndpointValues = { pageId, agentId };

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
              'Page is not deleted.',
              HttpStatus.BAD_REQUEST,
            );
          }

          checkRedlockSignalAborted(signals);

          await this.endpointService.deletePagePermanently(values);
        },
        signals,
      );
    });
  }
}

import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { isBase64 } from '@stdlib/base64';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { ChangeService } from './change.service';

class BodyDto extends createZodDto(
  z.object({
    groupCurrentPasswordHash: z.string().refine(isBase64),
    groupNewPasswordHash: z.string().refine(isBase64),

    groupEncryptedContentKeyring: z.string().refine(isBase64),
  }),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class ChangeController {
  constructor(private readonly endpointService: ChangeService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,

    @Param('groupId') groupId: string,

    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = { agentId, groupId, ...body, dtrx };

        if (
          !(await this.endpointService.agentHasSufficientPermissions(values))
        ) {
          throw new HttpException(
            'You do not have permission to enable password protection.',
            HttpStatus.FORBIDDEN,
          );
        }

        checkRedlockSignalAborted(signals);

        if (!(await this.endpointService.isGroupPasswordProtected(values))) {
          throw new HttpException(
            'This group is not password protected.',
            HttpStatus.BAD_REQUEST,
          );
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.changePasswordProtection(values);
      });
    });
  }
}

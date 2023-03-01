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

import { SaveService } from './save.service';

class BodyDto extends createZodDto(
  z.object({
    encryptedSymmetricKey: z.string().refine(isBase64),
    encryptedData: z.string().refine(isBase64),

    preRestore: z.boolean().optional(),
  }),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  pageId: string;

  dtrx: DataTransaction;
};

@Controller('')
export class SaveController {
  constructor(private readonly endpointService: SaveService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('pageId') pageId: string,
    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`page-lock:${pageId}`]], async (signals) => {
      const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

      checkRedlockSignalAborted(signals);

      return await usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          return await dataAbstraction().transaction(async (dtrx) => {
            const values: EndpointValues = {
              agentId,
              pageId,

              ...body,

              dtrx,
            };

            // Check sufficient permissions

            if (
              !(await this.endpointService.agentHasSufficientPermissions(
                values,
              ))
            ) {
              throw new HttpException(
                'Insufficient permissions.',
                HttpStatus.FORBIDDEN,
              );
            }

            checkRedlockSignalAborted(signals);

            // Restore snapshot

            await this.endpointService.saveSnapshot(values);
          });
        },
        signals,
      );
    });
  }
}

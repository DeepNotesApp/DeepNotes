import { Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { EnableService } from './enable.service';

export type EndpointValues = {
  userId: string;
  authenticatorSecret?: string;

  dtrx: DataTransaction;
};

@Controller()
export class EnableController {
  constructor(readonly endpointService: EnableService) {}

  @Post()
  async handle(@Locals('userId') userId: string) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = { userId, dtrx };

        if (await this.endpointService.isTwoFactorAuthEnabled(values)) {
          throw new HttpException(
            'Two factor authentication is already enabled.',
            HttpStatus.BAD_REQUEST,
          );
        }

        checkRedlockSignalAborted(signals);

        values.authenticatorSecret =
          await this.endpointService.generateTwoAuthSecret();

        checkRedlockSignalAborted(signals);

        await this.endpointService.saveTwoAuthSecretInDb(values);

        checkRedlockSignalAborted(signals);

        return await this.endpointService.createResponse(values);
      });
    });
  }
}

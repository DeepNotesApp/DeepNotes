import { Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { DisableService } from './disable.service';

@Controller()
export class DisableController {
  constructor(readonly endpointService: DisableService) {}

  @Post()
  async handle(@Locals('userId') userId: string) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        if (!(await this.endpointService.isTwoFactorAuthEnabled(userId))) {
          throw new HttpException(
            'Two factor authentication is not enabled.',
            HttpStatus.BAD_REQUEST,
          );
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.disableTwoFactorAuth({ userId, dtrx });
      });
    });
  }
}

import { Module } from '@stdlib/nestjs';

import { DisableController } from './disable.controller';
import { DisableService } from './disable.service';

@Module({
  controllers: [DisableController],
  providers: [DisableService],
})
export class DisableModule {}

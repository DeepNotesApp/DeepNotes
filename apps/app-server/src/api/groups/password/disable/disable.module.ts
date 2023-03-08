import { Module, UseModuleGuard } from '@stdlib/nestjs';

import { makePasswordGuard } from '../password.guard';
import { DisableController } from './disable.controller';
import { DisableService } from './disable.service';

@UseModuleGuard(makePasswordGuard('password'))
@Module({
  controllers: [DisableController],
  providers: [DisableService],
})
export class DisableModule {}

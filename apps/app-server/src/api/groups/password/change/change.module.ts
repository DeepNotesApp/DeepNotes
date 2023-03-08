import { Module, UseModuleGuard } from '@stdlib/nestjs';

import { makePasswordGuard } from '../password.guard';
import { ChangeController } from './change.controller';
import { ChangeService } from './change.service';

@UseModuleGuard(makePasswordGuard('current-password'))
@Module({
  controllers: [ChangeController],
  providers: [ChangeService],
})
export class ChangeModule {}

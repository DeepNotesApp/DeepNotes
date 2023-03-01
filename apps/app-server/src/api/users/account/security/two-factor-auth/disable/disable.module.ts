import { Module } from 'src/nest-plus';

import { DisableController } from './disable.controller';
import { DisableService } from './disable.service';

@Module({
  controllers: [DisableController],
  providers: [DisableService],
})
export class DisableModule {}

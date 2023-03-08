import { Module } from '@stdlib/nestjs';

import { EnableController } from './enable.controller';
import { EnableService } from './enable.service';

@Module({
  controllers: [EnableController],
  providers: [EnableService],
})
export class EnableModule {}

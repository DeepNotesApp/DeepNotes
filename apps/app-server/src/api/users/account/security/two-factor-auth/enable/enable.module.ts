import { Module } from 'src/nest-plus';

import { EnableController } from './enable.controller';
import { EnableService } from './enable.service';

@Module({
  controllers: [EnableController],
  providers: [EnableService],
})
export class EnableModule {}

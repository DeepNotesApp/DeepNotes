import { Module } from 'src/nest-plus';

import { BumpController } from './bump.controller';
import { BumpService } from './bump.service';

@Module({
  controllers: [BumpController],
  providers: [BumpService],
})
export class BumpModule {}

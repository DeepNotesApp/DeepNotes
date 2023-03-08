import { Module } from '@stdlib/nestjs';

import { BumpController } from './bump.controller';
import { BumpService } from './bump.service';

@Module({
  controllers: [BumpController],
  providers: [BumpService],
})
export class BumpModule {}

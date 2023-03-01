import { Module } from 'src/nest-plus';

import { MoveController } from './move.controller';
import { MoveService } from './move.service';

@Module({
  controllers: [MoveController],
  providers: [MoveService],
})
export class MoveModule {}

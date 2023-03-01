import { Module } from 'src/nest-plus';

import { DeleteController } from './delete.controller';
import { DeleteService } from './delete.service';

@Module({
  controllers: [DeleteController],
  providers: [DeleteService],
})
export class DeleteModule {}

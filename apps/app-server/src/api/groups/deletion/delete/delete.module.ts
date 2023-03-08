import { Module } from '@stdlib/nestjs';

import { DeleteController } from './delete.controller';
import { DeleteService } from './delete.service';

@Module({
  controllers: [DeleteController],
  providers: [DeleteService],
})
export class DeleteModule {}

import { Module } from '@stdlib/nestjs';

import { DeletePermanentlyController } from './delete-permanently.controller';
import { DeletePermanentlyService } from './delete-permanently.service';

@Module({
  controllers: [DeletePermanentlyController],
  providers: [DeletePermanentlyService],
})
export class DeletePermanentlyModule {}

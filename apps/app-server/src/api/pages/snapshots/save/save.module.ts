import { Module } from '@stdlib/nestjs';

import { SaveController } from './save.controller';
import { SaveService } from './save.service';

@Module({
  controllers: [SaveController],
  providers: [SaveService],
})
export class SaveModule {}

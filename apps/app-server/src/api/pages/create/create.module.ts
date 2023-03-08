import { Module } from '@stdlib/nestjs';

import { CreateController } from './create.controller';

@Module({
  controllers: [CreateController],
})
export class CreateModule {}

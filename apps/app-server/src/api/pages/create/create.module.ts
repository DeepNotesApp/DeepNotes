import { Module } from 'src/nest-plus';

import { CreateController } from './create.controller';

@Module({
  controllers: [CreateController],
})
export class CreateModule {}

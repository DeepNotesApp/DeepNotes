import { Module } from 'src/nest-plus';

import { RotateKeysController } from './rotate-keys.controller';

@Module({
  controllers: [RotateKeysController],
  providers: [],
})
export class RotateKeysModule {}

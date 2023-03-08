import { Module } from '@stdlib/nestjs';

import { RotateKeysController } from './rotate-keys.controller';

@Module({
  controllers: [RotateKeysController],
  providers: [],
})
export class RotateKeysModule {}

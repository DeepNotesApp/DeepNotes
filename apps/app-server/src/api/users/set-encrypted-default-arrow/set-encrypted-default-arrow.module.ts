import { Module } from '@stdlib/nestjs';

import { SetEncryptedDefaultArrowController } from './set-encrypted-default-arrow.controller';

@Module({
  controllers: [SetEncryptedDefaultArrowController],
  providers: [],
})
export class SetEncryptedDefaultArrowModule {}

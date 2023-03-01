import { Module } from 'src/nest-plus';

import { SetEncryptedDefaultArrowController } from './set-encrypted-default-arrow.controller';

@Module({
  controllers: [SetEncryptedDefaultArrowController],
  providers: [],
})
export class SetEncryptedDefaultArrowModule {}

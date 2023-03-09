import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { makePasswordGuard } from 'src/api/users/password.guard';

import { RotateKeysController } from './rotate-keys.controller';

@UseModuleGuard(makePasswordGuard('password'))
@Module({
  controllers: [RotateKeysController],
  providers: [],
})
export class RotateKeysModule {}

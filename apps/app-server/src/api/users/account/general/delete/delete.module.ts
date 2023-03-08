import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { makePasswordGuard } from 'src/api/users/password.guard';

import { DeleteController } from './delete.controller';

@UseModuleGuard(makePasswordGuard('password'))
@Module({
  controllers: [DeleteController],
  providers: [],
})
export class DeleteModule {}

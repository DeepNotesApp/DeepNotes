import { makePasswordGuard } from 'src/api/users/password.guard';
import { Module, UseModuleGuard } from 'src/nest-plus';

import { DeleteController } from './delete.controller';

@UseModuleGuard(makePasswordGuard('password'))
@Module({
  controllers: [DeleteController],
  providers: [],
})
export class DeleteModule {}

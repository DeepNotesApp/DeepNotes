import { Module } from '@stdlib/nestjs';

import { RemoveUserController } from './remove-user.controller';
import { RemoveUserService } from './remove-user.service';

@Module({
  controllers: [RemoveUserController],
  providers: [RemoveUserService],
})
export class RemoveUserModule {}

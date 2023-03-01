import { ProPlanGuard } from 'src/api/pro-plan.guard';
import { Module, UseModuleGuard } from 'src/nest-plus';

import { NonPersonalGroupGuard } from '../non-personal-group.guard';
import { ChangeUserRoleController } from './change-user-role.controller';
import { ChangeUserRoleService } from './change-user-role.service';

@UseModuleGuard(NonPersonalGroupGuard)
@UseModuleGuard(ProPlanGuard)
@Module({
  controllers: [ChangeUserRoleController],
  providers: [ChangeUserRoleService],
})
export class ChangeUserRoleModule {}

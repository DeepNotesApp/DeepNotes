import { ProPlanGuard } from 'src/api/pro-plan.guard';
import { Module, UseModuleGuard } from 'src/nest-plus';

import { NonPersonalGroupGuard } from '../non-personal-group.guard';
import { AcceptModule } from './accept/accept.module';
import { CancelModule } from './cancel/cancel.module';
import { RejectModule } from './reject/reject.module';
import { SendModule } from './send/send.module';

@UseModuleGuard(NonPersonalGroupGuard)
@UseModuleGuard(ProPlanGuard)
@Module({
  imports: [
    { prefix: 'send', module: SendModule },
    { prefix: 'cancel', module: CancelModule },
    { prefix: 'accept', module: AcceptModule },
    { prefix: 'reject', module: RejectModule },
  ],
})
export class JoinInvitationsModule {}

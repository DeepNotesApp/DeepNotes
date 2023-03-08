import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { ProPlanGuard } from 'src/api/pro-plan.guard';

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
    { prefix: 'accept', module: AcceptModule },
    { prefix: 'cancel', module: CancelModule },
    { prefix: 'reject', module: RejectModule },
  ],
})
export class JoinRequestsModule {}

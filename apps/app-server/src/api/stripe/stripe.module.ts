import { Module, UseModuleGuard } from '@stdlib/nestjs';

import { DemoGuard } from '../demo.guard';
import { CreateCheckoutSessionModule } from './create-checkout-session/create-checkout-session.module';
import { CreatePortalSessionModule } from './create-portal-session/create-portal-session.module';

@UseModuleGuard(DemoGuard)
@Module({
  imports: [
    { prefix: 'create-checkout-session', module: CreateCheckoutSessionModule },
    { prefix: 'create-portal-session', module: CreatePortalSessionModule },
  ],
})
export class StripeModule {}

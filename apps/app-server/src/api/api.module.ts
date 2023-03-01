import { makeAuthGuard } from 'src/auth/auth.guard';
import { Module, UseModuleGuard } from 'src/nest-plus';

import { GroupsModule } from './groups/groups.module';
import { PagesModule } from './pages/pages.module';
import { StripeModule } from './stripe/stripe.module';
import { UsersModule } from './users/users.module';

@UseModuleGuard(makeAuthGuard())
@Module({
  imports: [
    { prefix: 'users', module: UsersModule },
    { prefix: 'pages', module: PagesModule },
    { prefix: 'groups', module: GroupsModule },
    { prefix: 'stripe', module: StripeModule },
  ],
})
export class ApiModule {}

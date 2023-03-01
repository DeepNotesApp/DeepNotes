import { Module } from 'src/nest-plus';

import { CreateCheckoutSessionController } from './create-checkout-session.controller';

@Module({
  controllers: [CreateCheckoutSessionController],
  providers: [],
})
export class CreateCheckoutSessionModule {}

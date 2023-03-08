import { Module } from '@stdlib/nestjs';

import { CreateCheckoutSessionController } from './create-checkout-session.controller';

@Module({
  controllers: [CreateCheckoutSessionController],
  providers: [],
})
export class CreateCheckoutSessionModule {}

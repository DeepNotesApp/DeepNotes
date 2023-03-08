import { APP_GUARD, APP_PIPE, RouterModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Module } from '@stdlib/nestjs';
import { ZodValidationPipe } from 'nestjs-zod';

import { ApiModule } from './api/api.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 15,
    }),

    { prefix: 'auth', module: AuthModule },
    { prefix: 'api', module: ApiModule },

    RouterModule,

    JwtModule,

    { prefix: 'stripe', module: StripeModule },
  ],

  controllers: [AppController],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}

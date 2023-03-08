import { Module } from '@stdlib/nestjs';

import { TestWebhookModule } from './test-webhook/test-webhook.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    { prefix: 'webhook', module: WebhookModule },
    { prefix: 'test-webhook', module: TestWebhookModule },
  ],
})
export class StripeModule {}

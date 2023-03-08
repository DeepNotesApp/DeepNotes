import { Module } from '@stdlib/nestjs';

import { TestWebhookController } from './test-webhook.controller';
import { TestWebhookService } from './test-webhook.service';

@Module({
  controllers: [TestWebhookController],
  providers: [TestWebhookService],
})
export class TestWebhookModule {}

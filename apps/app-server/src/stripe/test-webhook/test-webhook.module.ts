import { Module } from 'src/nest-plus';

import { TestWebhookController } from './test-webhook.controller';
import { TestWebhookService } from './test-webhook.service';

@Module({
  controllers: [TestWebhookController],
  providers: [TestWebhookService],
})
export class TestWebhookModule {}

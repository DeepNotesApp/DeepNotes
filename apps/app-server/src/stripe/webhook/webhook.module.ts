import { Module } from 'src/nest-plus';

import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}

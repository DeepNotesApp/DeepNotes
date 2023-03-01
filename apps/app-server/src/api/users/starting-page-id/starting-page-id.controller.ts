import { Controller, Post } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { Locals } from 'src/utils';

@Controller()
export class StartingPageIdController {
  @Post()
  async handle(@Locals('userId') userId: string) {
    return {
      startingPageId: await dataAbstraction().hget(
        'user',
        userId,
        'starting-page-id',
      ),
    };
  }
}

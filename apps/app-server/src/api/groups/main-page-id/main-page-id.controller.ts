import { Controller, Param, Post } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';

@Controller()
export class MainPageIdController {
  @Post()
  async handle(@Param('groupId') groupId: string) {
    return {
      mainPageId: await dataAbstraction().hget(
        'group',
        groupId,
        'main-page-id',
      ),
    };
  }
}

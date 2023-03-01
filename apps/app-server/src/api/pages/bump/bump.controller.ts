import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Locals } from 'src/utils';

import { BumpService } from './bump.service';

export type EndpointValues = {
  userId: string;
  pageId: string;
  parentPageId?: string;
};

@Controller()
export class BumpController {
  constructor(readonly endpointService: BumpService) {}

  @Post()
  async handle(
    @Locals('userId') userId: string,

    @Param('pageId') pageId: string,
    @Body('parentPageId') parentPageId?: string,
  ) {
    const values: EndpointValues = {
      userId,
      pageId,
      parentPageId,
    };

    if (!(await this.endpointService.pageExists(pageId))) {
      throw new HttpException(
        'This page does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }

    await Promise.all([
      this.endpointService.updateStartingPageId(values),
      this.endpointService.updateLastParentId(values),
      this.endpointService.updatePageLink(values),

      this.endpointService.updateRecentPageIds(values),
      this.endpointService.updateRecentGroupIds(values),

      this.endpointService.updatePageLastActivityDate(values),
      this.endpointService.updateGroupLastActivityDate(values),
    ]);
  }
}

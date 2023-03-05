import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { isNanoID } from '@stdlib/misc';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { Locals } from 'src/utils';

import { BumpService } from './bump.service';

class BodyDto extends createZodDto(
  z.object({
    parentPageId: z.string().refine(isNanoID).optional(),
  }),
) {}

export type EndpointValues = BodyDto & {
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
    @Body() body: BodyDto,
  ) {
    const values: EndpointValues = {
      userId,
      pageId,

      ...body,
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

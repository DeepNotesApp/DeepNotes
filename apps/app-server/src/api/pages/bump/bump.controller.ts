import { Body, Controller, Param, Post } from '@nestjs/common';
import { isNanoID } from '@stdlib/misc';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
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

  groupId: string;
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
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    const values: EndpointValues = {
      userId,
      pageId,

      groupId,

      ...body,
    };

    await Promise.all([
      this.endpointService.updateStartingPageId(values),
      this.endpointService.updateLastParentId(values),

      this.endpointService.updatePageLink(values),
      this.endpointService.updatePageBacklinks(values),

      this.endpointService.updateRecentPageIds(values),
      this.endpointService.updateRecentGroupIds(values),

      this.endpointService.updatePageLastActivityDate(values),
      this.endpointService.updateGroupLastActivityDate(values),
    ]);
  }
}

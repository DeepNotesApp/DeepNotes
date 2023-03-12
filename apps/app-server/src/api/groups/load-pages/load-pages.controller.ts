import { PageModel } from '@deeplib/db';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { userHasPermission } from 'src/deep-utils';
import { Locals } from 'src/utils';

class BodyDto extends createZodDto(
  z.object({
    lastPageId: z.string().nullable(),
  }),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;

  agentHasSufficientPermissions: typeof agentHasSufficientPermissions;
};

@Controller()
export class LoadPagesController {
  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
    @Body() body: BodyDto,
  ) {
    return loadPages({
      agentId,
      groupId,

      ...body,

      agentHasSufficientPermissions,
    });
  }
}

export async function loadPages(values: EndpointValues) {
  if (!(await values.agentHasSufficientPermissions(values))) {
    throw new HttpException('Insufficient permissions.', HttpStatus.FORBIDDEN);
  }

  let pages: PageModel[] = [];

  if (values.lastPageId === null) {
    pages = await PageModel.query()
      .where('group_id', values.groupId)
      .orderBy('last_activity_date', 'DESC')
      .limit(20)
      .select('id');
  } else {
    pages = await PageModel.query()
      .where('group_id', values.groupId)
      .andWhere(
        'last_activity_date',
        '>',
        PageModel.query()
          .findById(values.lastPageId)
          .select('last_activity_date'),
      )
      .orderBy('last_activity_date', 'DESC')
      .limit(20)
      .select('id');
  }

  return { pageIds: pages.map((page) => page.id) };
}

async function agentHasSufficientPermissions({
  groupId,
  agentId,
}: EndpointValues) {
  return await userHasPermission(agentId, groupId, 'viewGroup');
}

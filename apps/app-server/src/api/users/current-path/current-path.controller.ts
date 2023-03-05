import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { isNanoID } from '@stdlib/misc';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { Locals } from 'src/utils';

import { CurrentPathService } from './current-path.service';

class BodyDto extends createZodDto(
  z.object({
    initialPageId: z.string().refine(isNanoID),
  }),
) {}

export type EndpointValues = BodyDto & {
  userId: string;
  initialPageId: string;
  mainPageId?: string;
};

@Controller()
export class CurrentPathController {
  constructor(readonly endpointService: CurrentPathService) {}

  @Post()
  async handle(@Locals('userId') userId: string, @Body() body: BodyDto) {
    const values: EndpointValues = {
      userId,

      ...body,
    };

    if (!(await this.endpointService.initialPageExists(values))) {
      throw new HttpException(
        'This page does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }

    const pathPageIds = await this.endpointService.getPathPageIds(values);

    if (pathPageIds != null) {
      return { pathPageIds };
    }

    // Insert page into the last used path

    await this.endpointService.insertPageIntoLastPath(values);

    // Get the path again

    return {
      pathPageIds: await this.endpointService.getPathPageIds(values),
    };
  }
}

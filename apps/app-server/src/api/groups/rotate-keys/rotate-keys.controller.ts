import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { userHasPermission } from 'src/deep-utils';
import {
  getGroupKeyRotationValues,
  groupKeyRotationSchema,
  rotateGroupKeys,
} from 'src/group-key-rotation';
import { Locals } from 'src/utils';

class BodyDto extends createZodDto(groupKeyRotationSchema.partial()) {}

@Controller()
export class RotateKeysController {
  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
    @Body() body: BodyDto,
  ) {
    if (!(await userHasPermission(agentId, groupId, 'manageLowerRanks'))) {
      throw new HttpException(
        'Insufficient permissions.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!groupKeyRotationSchema.safeParse(body).success) {
      return await getGroupKeyRotationValues(groupId, agentId);
    }

    return await rotateGroupKeys({
      groupId,

      ...(body as Required<BodyDto>),
    });
  }
}

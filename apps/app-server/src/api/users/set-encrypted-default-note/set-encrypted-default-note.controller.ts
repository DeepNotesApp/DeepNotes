import { Body, Controller, Post } from '@nestjs/common';
import { base64ToBytes, isBase64 } from '@stdlib/base64';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { Locals } from 'src/utils';

class BodyDto extends createZodDto(
  z.object({
    encryptedDefaultNote: z.string().refine(isBase64),
  }),
) {}

@Controller()
export class SetEncryptedDefaultNoteController {
  @Post()
  async handle(
    @Locals('userId') userId: string,
    @Body() { encryptedDefaultNote }: BodyDto,
  ) {
    await dataAbstraction().patch('user', userId, {
      encrypted_default_note: base64ToBytes(encryptedDefaultNote),
    });
  }
}

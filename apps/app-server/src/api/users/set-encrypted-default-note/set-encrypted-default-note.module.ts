import { Module } from '@stdlib/nestjs';

import { SetEncryptedDefaultNoteController } from './set-encrypted-default-note.controller';

@Module({
  controllers: [SetEncryptedDefaultNoteController],
  providers: [],
})
export class SetEncryptedDefaultNoteModule {}

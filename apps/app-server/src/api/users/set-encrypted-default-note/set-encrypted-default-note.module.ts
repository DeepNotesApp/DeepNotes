import { Module } from 'src/nest-plus';

import { SetEncryptedDefaultNoteController } from './set-encrypted-default-note.controller';

@Module({
  controllers: [SetEncryptedDefaultNoteController],
  providers: [],
})
export class SetEncryptedDefaultNoteModule {}

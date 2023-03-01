import { Model } from 'objection';

export class GroupModel extends Model {
  static override tableName = 'groups';

  id!: string;

  encrypted_name!: Uint8Array;

  main_page_id!: string;

  user_id!: string | null;

  encrypted_rehashed_password_hash!: Uint8Array | null;

  access_keyring!: Uint8Array | null;
  encrypted_content_keyring!: Uint8Array;

  public_keyring!: Uint8Array;
  encrypted_private_keyring!: Uint8Array;

  permanent_deletion_date!: Date | null;
}

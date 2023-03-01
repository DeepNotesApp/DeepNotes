import type { Plan } from '@deeplib/misc';
import { Model } from 'objection';

export class UserModel extends Model {
  static override tableName = 'users';

  id!: string;

  encrypted_email!: Uint8Array;
  email_hash!: Uint8Array;

  email_verified!: boolean;

  encrypted_rehashed_login_hash!: Uint8Array;

  encrypted_new_email!: Uint8Array | null;
  email_verification_code!: string | null;
  email_verification_expiration_date!: Date | null;

  two_factor_auth_enabled!: boolean;
  encrypted_authenticator_secret!: Uint8Array | null;
  encrypted_recovery_codes!: Uint8Array | null;

  personal_group_id!: string;

  public_keyring!: Uint8Array;

  encrypted_private_keyring!: Uint8Array;
  encrypted_symmetric_keyring!: Uint8Array;

  encrypted_name!: Uint8Array;

  encrypted_default_note!: Uint8Array;
  encrypted_default_arrow!: Uint8Array;

  starting_page_id!: string;

  recent_page_ids!: string[];
  recent_group_ids!: string[];

  customer_id!: string | null;
  plan!: Plan;
  subscription_id!: string | null;

  last_notification_read!: number | null;

  num_free_pages!: number;

  demo!: boolean;

  creation_date!: Date;
}

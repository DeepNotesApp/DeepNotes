import { decryptUserEmail } from '@deeplib/data';
import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
  UserModel,
} from '@deeplib/db';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  base64ToBytes,
  base64ToBytesSafe,
  bytesToBase64,
  bytesToBase64Safe,
  isBase64,
} from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  getPasswordHashValues,
} from '@stdlib/crypto';
import { objFromEntries } from '@stdlib/misc';
import { FastifyReply } from 'fastify';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { clearCookies } from 'src/cookies';
import { derivePasswordValues } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import { invalidateAllSessions } from 'src/deep-utils';
import { decryptUserRehashedLoginHash, Locals } from 'src/utils';

const userKeyRotationSchema = z.object({
  userEncryptedSymmetricKeyring: z.string().refine(isBase64),
  userEncryptedPrivateKeyring: z.string().refine(isBase64),
  userPublicKeyring: z.string().refine(isBase64),

  userEncryptedDefaultNote: z.string().refine(isBase64),
  userEncryptedDefaultArrow: z.string().refine(isBase64),
  userEncryptedName: z.string().refine(isBase64),

  groupJoinRequests: z.record(
    z.object({
      encryptedNameForUser: z.string().refine(isBase64),
    }),
  ),
  groupJoinInvitations: z.record(
    z.object({
      encryptedAccessKeyring: z.string().refine(isBase64).nullable(),
      encryptedInternalKeyring: z.string().refine(isBase64),
    }),
  ),
  groupMembers: z.record(
    z.object({
      encryptedAccessKeyring: z.string().refine(isBase64).nullable(),
      encryptedInternalKeyring: z.string().refine(isBase64),
    }),
  ),
});

class BodyDto extends createZodDto(
  z
    .object({
      loginHash: z.string().refine(isBase64),
    })
    .merge(userKeyRotationSchema.partial()),
) {}

@Controller()
export class RotateKeysController {
  @Post()
  async handle(
    @Locals('userId') userId: string,

    @Body() body: BodyDto,

    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return await dataAbstraction().transaction(async (dtrx) => {
      const user = await UserModel.query()
        .findById(userId)
        .select('encrypted_rehashed_login_hash');

      if (user == null) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const passwordHashValues = getPasswordHashValues(
        decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
      );

      const passwordValues = derivePasswordValues(
        base64ToBytes(body.loginHash),
        passwordHashValues.saltBytes,
      );

      if (!userKeyRotationSchema.safeParse(body).success) {
        const [user, groupJoinRequests, groupJoinInvitations, groupMembers] =
          await Promise.all([
            UserModel.query().findById(userId).select(
              'encrypted_email',

              'encrypted_symmetric_keyring',
              'encrypted_private_keyring',
              'public_keyring',

              'encrypted_default_note',
              'encrypted_default_arrow',

              'encrypted_name',
            ),

            GroupJoinRequestModel.query().where('user_id', userId).select(
              'group_id',

              'encrypted_name_for_user',
            ),

            GroupJoinInvitationModel.query().where('user_id', userId).select(
              'group_id',

              'encrypted_access_keyring',
              'encrypted_internal_keyring',
            ),

            GroupMemberModel.query().where('user_id', userId).select(
              'group_id',

              'encrypted_access_keyring',
              'encrypted_internal_keyring',
            ),
          ]);

        if (user == null) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        return {
          userEmail: decryptUserEmail(user.encrypted_email),

          userEncryptedSymmetricKeyring: bytesToBase64(
            createSymmetricKeyring(
              user.encrypted_symmetric_keyring,
            ).unwrapSymmetric(passwordValues.key, {
              associatedData: {
                context: 'UserEncryptedSymmetricKeyring',
                userId,
              },
            }).fullValue,
          ),
          userEncryptedPrivateKeyring: bytesToBase64(
            createPrivateKeyring(
              user.encrypted_private_keyring,
            ).unwrapSymmetric(passwordValues.key, {
              associatedData: {
                context: 'UserEncryptedPrivateKeyring',
                userId,
              },
            }).fullValue,
          ),
          userPublicKeyring: bytesToBase64Safe(user.public_keyring),

          userEncryptedDefaultNote: bytesToBase64(user.encrypted_default_note),
          userEncryptedDefaultArrow: bytesToBase64(
            user.encrypted_default_arrow,
          ),
          userEncryptedName: bytesToBase64(user.encrypted_name),

          groupJoinRequests: objFromEntries(
            groupJoinRequests.map((groupJoinRequest) => [
              groupJoinRequest.group_id,
              {
                encryptedNameForUser: bytesToBase64(
                  groupJoinRequest.encrypted_name_for_user,
                ),
              },
            ]),
          ),
          groupJoinInvitations: objFromEntries(
            groupJoinInvitations.map((groupJoinInvitation) => [
              groupJoinInvitation.group_id,
              {
                encryptedAccessKeyring: bytesToBase64Safe(
                  groupJoinInvitation.encrypted_access_keyring,
                ),
                encryptedInternalKeyring: bytesToBase64(
                  groupJoinInvitation.encrypted_internal_keyring,
                ),
              },
            ]),
          ),
          groupMembers: objFromEntries(
            groupMembers.map((groupMember) => [
              groupMember.group_id,
              {
                encryptedAccessKeyring: bytesToBase64Safe(
                  groupMember.encrypted_access_keyring,
                ),
                encryptedInternalKeyring: bytesToBase64(
                  groupMember.encrypted_internal_keyring,
                ),
              },
            ]),
          ),
        };
      }

      await Promise.all([
        await dataAbstraction().patch(
          'user',
          userId,
          {
            encrypted_symmetric_keyring: createSymmetricKeyring(
              base64ToBytes(body.userEncryptedSymmetricKeyring!),
            ).wrapSymmetric(passwordValues.key, {
              associatedData: {
                context: 'UserEncryptedSymmetricKeyring',
                userId,
              },
            }).fullValue,
            encrypted_private_keyring: createSymmetricKeyring(
              base64ToBytes(body.userEncryptedPrivateKeyring!),
            ).wrapSymmetric(passwordValues.key, {
              associatedData: {
                context: 'UserEncryptedPrivateKeyring',
                userId,
              },
            }).fullValue,
            public_keyring: base64ToBytes(body.userPublicKeyring!),

            encrypted_default_note: base64ToBytes(
              body.userEncryptedDefaultNote!,
            ),
            encrypted_default_arrow: base64ToBytes(
              body.userEncryptedDefaultArrow!,
            ),
            encrypted_name: base64ToBytes(body.userEncryptedName!),
          },
          { dtrx },
        ),

        ...Object.entries(body.groupJoinRequests!).map(
          async ([groupId, groupJoinRequest]) => {
            await dataAbstraction().patch(
              'group-join-request',
              `${groupId}:${userId}`,
              {
                encrypted_name_for_user: base64ToBytes(
                  groupJoinRequest.encryptedNameForUser,
                ),
              },
              { dtrx },
            );
          },
        ),
        ...Object.entries(body.groupJoinInvitations!).map(
          async ([groupId, groupJoinInvitation]) => {
            await dataAbstraction().patch(
              'group-join-invitation',
              `${groupId}:${userId}`,
              {
                encrypted_access_keyring: base64ToBytesSafe(
                  groupJoinInvitation.encryptedAccessKeyring,
                ),
                encrypted_internal_keyring: base64ToBytes(
                  groupJoinInvitation.encryptedInternalKeyring,
                ),
              },
              { dtrx },
            );
          },
        ),
        ...Object.entries(body.groupMembers!).map(
          async ([groupId, groupMember]) => {
            await dataAbstraction().patch(
              'group-member',
              `${groupId}:${userId}`,
              {
                encrypted_access_keyring: base64ToBytesSafe(
                  groupMember.encryptedAccessKeyring,
                ),
                encrypted_internal_keyring: base64ToBytes(
                  groupMember.encryptedInternalKeyring,
                ),
              },
              { dtrx },
            );
          },
        ),
      ]);

      await invalidateAllSessions(userId);

      clearCookies(reply);
    });
  }
}

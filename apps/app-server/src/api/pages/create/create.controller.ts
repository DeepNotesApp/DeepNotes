import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { base64ToBytes, isBase64 } from '@stdlib/base64';
import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import * as DeepUtils from 'src/deep-utils';
import { Locals } from 'src/utils';

class BodyDto extends createZodDto(
  z.object({
    parentPageId: z.string().refine(isNanoID),
    groupId: z.string().refine(isNanoID),
    pageId: z.string().refine(isNanoID),

    pageEncryptedSymmetricKeyring: z.string().refine(isBase64),
    pageEncryptedRelativeTitle: z.string().refine(isBase64),
    pageEncryptedAbsoluteTitle: z.string().refine(isBase64),

    createGroup: z.boolean(),
    groupEncryptedName: z.string().refine(isBase64).optional(),
    groupPasswordHash: z.string().refine(isBase64).optional(),
    groupIsPublic: z.boolean().optional(),

    accessKeyring: z.string().refine(isBase64).optional(),
    groupEncryptedInternalKeyring: z.string().refine(isBase64).optional(),
    groupEncryptedContentKeyring: z.string().refine(isBase64).optional(),

    groupPublicKeyring: z.string().refine(isBase64).optional(),
    groupEncryptedPrivateKeyring: z.string().refine(isBase64).optional(),

    groupOwnerEncryptedName: z.string().refine(isBase64).optional(),
  }),
) {}

@Controller()
export class CreateController {
  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Body()
    {
      parentPageId,
      groupId,
      pageId,

      pageEncryptedSymmetricKeyring,
      pageEncryptedRelativeTitle,
      pageEncryptedAbsoluteTitle,

      createGroup,
      groupEncryptedName,
      groupPasswordHash,
      groupIsPublic,
      accessKeyring,
      groupEncryptedInternalKeyring,
      groupEncryptedContentKeyring,
      groupPublicKeyring,
      groupEncryptedPrivateKeyring,
      groupOwnerEncryptedName,
    }: BodyDto,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const [userPlan, personalGroupId] = await dataAbstraction().hmget(
          'user',
          agentId,
          ['plan', 'personal-group-id'],
        );

        // Check valid destination group

        if (
          userPlan !== 'pro' &&
          (groupId !== personalGroupId || createGroup)
        ) {
          throw new HttpException(
            'This action requires a Pro plan subscription.',
            HttpStatus.FORBIDDEN,
          );
        }

        // Check if can create page

        let numFreePages = 10;

        if (userPlan !== 'pro') {
          numFreePages = await dataAbstraction().hget(
            'user',
            agentId,
            'num-free-pages',
          );

          if (numFreePages >= 10) {
            throw new HttpException(
              'You have reached your limit of 10 free pages.',
              HttpStatus.FORBIDDEN,
            );
          }
        }

        // Check sufficient permissions

        if (!createGroup) {
          if (
            !(await DeepUtils.userHasPermission(
              agentId,
              groupId,
              'editGroupPages',
            ))
          ) {
            throw new HttpException(
              'Insufficient permissions.',
              HttpStatus.FORBIDDEN,
            );
          }
        }

        // Create page

        if (createGroup) {
          if (
            groupEncryptedName == null ||
            groupIsPublic == null ||
            accessKeyring == null ||
            groupEncryptedInternalKeyring == null ||
            groupEncryptedContentKeyring == null ||
            groupPublicKeyring == null ||
            groupEncryptedPrivateKeyring == null ||
            groupOwnerEncryptedName == null
          ) {
            throw new HttpException(
              'Missing required fields.',
              HttpStatus.BAD_REQUEST,
            );
          }

          await DeepUtils.createGroup({
            groupId,
            encryptedName: groupEncryptedName,
            passwordHash: groupPasswordHash,
            isPublic: !!groupIsPublic,
            isPersonal: false,

            userId: agentId,

            accessKeyring: accessKeyring,
            encryptedInternalKeyring: groupEncryptedInternalKeyring,
            encryptedContentKeyring: groupEncryptedContentKeyring,

            publicKeyring: groupPublicKeyring,
            encryptedPrivateKeyring: groupEncryptedPrivateKeyring,

            encryptedUserName: groupOwnerEncryptedName,

            mainPageId: pageId,

            dtrx,
          });

          checkRedlockSignalAborted(signals);
        }

        await Promise.all([
          dataAbstraction().insert(
            'page',
            pageId,
            {
              id: pageId,
              encrypted_symmetric_keyring: base64ToBytes(
                pageEncryptedSymmetricKeyring,
              ),
              encrypted_relative_title: base64ToBytes(
                pageEncryptedRelativeTitle,
              ),
              encrypted_absolute_title: base64ToBytes(
                pageEncryptedAbsoluteTitle,
              ),
              group_id: groupId,
              free: userPlan !== 'pro',
            },
            { dtrx },
          ),

          dataAbstraction().insert(
            'user-page',
            `${agentId}:${pageId}`,
            {
              user_id: agentId,
              page_id: pageId,
              last_parent_id: parentPageId,
            },
            { dtrx },
          ),
        ]);

        if (userPlan === 'pro') {
          return { pageId };
        }

        await dataAbstraction().patch(
          'user',
          agentId,
          { num_free_pages: numFreePages + 1 },
          { dtrx },
        );

        return {
          pageId,
          message: `Page created successfully. (${numFreePages + 1}/10)`,
        };
      });
    });
  }
}

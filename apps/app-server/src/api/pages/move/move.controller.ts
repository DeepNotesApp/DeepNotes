import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { isBase64 } from '@stdlib/base64';
import type { DataTransaction } from '@stdlib/data';
import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { MoveService } from './move.service';

export const pageKeyRotationSchema = z.object({
  pageEncryptedSymmetricKeyring: z.string().refine(isBase64),
  pageEncryptedRelativeTitle: z.string().refine(isBase64),
  pageEncryptedAbsoluteTitle: z.string().refine(isBase64),
  pageEncryptedUpdate: z.string().refine(isBase64),
  pageEncryptedSnapshots: z.record(
    z.object({
      encryptedSymmetricKey: z.string().refine(isBase64),
      encryptedData: z.string().refine(isBase64),
    }),
  ),
});

class BodyDto extends createZodDto(
  z
    .object({
      destGroupId: z.string().refine(isNanoID),
      setAsMainPage: z.boolean(),

      createGroup: z.boolean(),
      groupEncryptedName: z.string().refine(isBase64).optional(),
      groupPasswordHash: z.string().refine(isBase64).optional(),
      groupIsPublic: z.boolean().optional(),
      accessKeyring: z.string().refine(isBase64).optional(),
      groupEncryptedInternalKeyring: z.string().refine(isBase64).optional(),
      groupEncryptedContentKeyring: z.string().refine(isBase64).optional(),
      groupPublicKeyring: z.string().refine(isBase64).optional(),
      groupEncryptedPrivateKeyring: z.string().refine(isBase64).optional(),
      groupMemberEncryptedName: z.string().refine(isBase64).optional(),

      requestId: z.string().refine(isBase64).optional(),
    })
    .merge(pageKeyRotationSchema.partial()),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  pageId: string;
  sourceGroupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class MoveController {
  constructor(private readonly endpointService: MoveService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('pageId') pageId: string,
    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`page-lock:${pageId}`]], async (signals) => {
      const sourceGroupId = await dataAbstraction().hget(
        'page',
        pageId,
        'group-id',
      );

      checkRedlockSignalAborted(signals);

      return await usingLocks(
        [[`group-lock:${sourceGroupId}`], [`group-lock:${body.destGroupId}`]],
        async (signals) => {
          return await dataAbstraction().transaction(async (dtrx) => {
            const values: EndpointValues = {
              agentId,
              pageId,
              sourceGroupId,

              ...body,

              dtrx,
            };

            if (
              !(await this.endpointService.agentHasSufficientSubscription(
                values,
              ))
            ) {
              throw new HttpException(
                'This action requires a Pro plan subscription.',
                HttpStatus.FORBIDDEN,
              );
            }

            if (
              !(await this.endpointService.agentHasSufficientPermissions(
                values,
              ))
            ) {
              throw new HttpException(
                'Insufficient permissions.',
                HttpStatus.FORBIDDEN,
              );
            }

            checkRedlockSignalAborted(signals);

            if (
              !(await this.endpointService.agentProvidedNecessaryData(values))
            ) {
              checkRedlockSignalAborted(signals);

              return await this.endpointService.getNecessaryDataForClient(
                values,
              );
            }

            checkRedlockSignalAborted(signals);

            if (await this.endpointService.isMainPageOfSourceGroup(values)) {
              throw new HttpException(
                'Cannot move main page of a group. Please set another page as main page first.',
                HttpStatus.BAD_REQUEST,
              );
            }

            checkRedlockSignalAborted(signals);

            if (values.createGroup) {
              if (
                values.groupEncryptedName == null ||
                values.groupIsPublic == null ||
                values.accessKeyring == null ||
                values.groupEncryptedInternalKeyring == null ||
                values.groupEncryptedContentKeyring == null ||
                values.groupPublicKeyring == null ||
                values.groupEncryptedPrivateKeyring == null ||
                values.groupMemberEncryptedName == null
              ) {
                throw new HttpException(
                  'Missing values for group creation.',
                  HttpStatus.BAD_REQUEST,
                );
              }

              await this.endpointService.createGroup(values);
            }

            checkRedlockSignalAborted(signals);

            await this.endpointService.movePage(values);
          });
        },
        signals,
      );
    });
  }
}

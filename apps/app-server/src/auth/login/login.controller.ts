import type { DeviceModel, UserModel } from '@deeplib/db';
import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Ip,
  Post,
  Res,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { base64ToBytes, isBase64 } from '@stdlib/base64';
import { getPasswordHashValues, wrapSymmetricKey } from '@stdlib/crypto';
import { equalUint8Arrays, w3cEmailRegex } from '@stdlib/misc';
import { FastifyReply } from 'fastify';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import type { TransactionOrKnex } from 'objection';
import type { PasswordValues } from 'src/crypto';
import { derivePasswordValues } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import { createUser } from 'src/deep-utils';
import { decryptUserRehashedLoginHash } from 'src/utils';

import { RegistrationSchema } from '../register/register.controller';
import { LoginService } from './login.service';

class BodyDto extends createZodDto(
  z.object({
    email: z
      .string()
      .regex(w3cEmailRegex)
      .or(z.string().refine((email) => email === 'demo'))
      .transform((email) => email.toLowerCase()),
    loginHash: z.string().refine(isBase64),
    rememberSession: z.boolean(),

    authenticatorToken: z.string().optional(),
    rememberDevice: z.boolean().optional(),

    recoveryCode: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),

    demo: RegistrationSchema.optional(),
  }),
) {}

export type EndpointValues = BodyDto & {
  ip: string;
  userAgent: string;
  reply: FastifyReply;

  user: UserModel;
  device: DeviceModel;

  sessionId: string;
  sessionKey: Uint8Array;
  refreshCode: string;

  jwtService: JwtService;

  loginBlockTTL: number;

  passwordValues?: PasswordValues;

  trx?: TransactionOrKnex;
};

@Controller()
export class LoginController {
  constructor(
    readonly endpointService: LoginService,

    readonly jwtService: JwtService,
  ) {}

  @Post()
  async handle(
    @Body() body: BodyDto,

    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,

    @Res({ passthrough: true }) reply?: FastifyReply,
  ) {
    return await dataAbstraction().transaction(async ({ trx }) => {
      const values: EndpointValues = {
        ...body,

        ip,
        userAgent,
        reply,

        jwtService: this.jwtService,

        trx,
      } as any;

      // Limit login attempts

      if (
        await this.endpointService.checkExcessiveFailedLoginAttempts(values)
      ) {
        throw new HttpException(
          `Too many failed login attempts. Try again in ${values.loginBlockTTL} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (values.demo != null) {
        if (RegistrationSchema.safeParse(values.demo).success) {
          // Create demo account

          values.email = `demo-${nanoid()}`;

          values.passwordValues = {
            hash: sodium.randombytes_buf(64),
            key: wrapSymmetricKey(sodium.randombytes_buf(32)),
            salt: new Uint8Array(sodium.randombytes_buf(16)),
          };

          values.user = await createUser({
            ...values,

            ...values.demo,

            demo: true,

            passwordValues: values.passwordValues,
          });
        } else {
          throw new HttpException(
            'Incorrect email or password.',
            HttpStatus.FORBIDDEN,
          );
        }
      } else {
        // Get user

        values.user = (await this.endpointService.getUserData(values))!;

        if (values.user == null) {
          await this.endpointService.incrementFailedLoginAttempts(values);

          throw new HttpException(
            'Incorrect email or password.',
            HttpStatus.FORBIDDEN,
          );
        }

        // Check correct password

        const passwordHashValues = getPasswordHashValues(
          decryptUserRehashedLoginHash(
            values.user.encrypted_rehashed_login_hash,
          ),
        );

        values.passwordValues = derivePasswordValues(
          base64ToBytes(values.loginHash),
          passwordHashValues.saltBytes,
        );

        const passwordIsCorrect = equalUint8Arrays(
          values.passwordValues.hash,
          passwordHashValues.hashBytes,
        );

        if (!passwordIsCorrect) {
          await this.endpointService.incrementFailedLoginAttempts(values);

          throw new HttpException(
            'Incorrect email or password.',
            HttpStatus.FORBIDDEN,
          );
        }

        // Check email awaiting verification

        if (!values.user.email_verified) {
          throw new HttpException(
            'Email awaiting verification.',
            HttpStatus.FORBIDDEN,
          );
        }
      }

      // Get device

      values.device = await this.endpointService.getDevice(values);

      // Two-factor authentication

      const twoFactorAuthResult = await this.endpointService.checkTwoFactorAuth(
        values,
      );

      if (twoFactorAuthResult != null) {
        return twoFactorAuthResult;
      }

      await this.endpointService.insertSessionInDb(values);

      await this.endpointService.setAuthCookies(values);

      return await this.endpointService.createResponse(values);
    });
  }
}

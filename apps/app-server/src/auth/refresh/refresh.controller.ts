import type { SessionModel } from '@deeplib/db';
import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { FastifyReply } from 'fastify';
import { Cookies } from 'src/utils';

import { RefreshService } from './refresh.service';

export type EndpointValues = {
  jwtService: JwtService;

  sessionId: string;
  refreshCode: string;
  rememberSession: boolean;

  loggedIn: string | undefined;
  refreshToken: string | undefined;

  session: SessionModel;
  reply: FastifyReply;

  oldSessionKey: Uint8Array;
  newSessionKey: Uint8Array;

  newRefreshCode: string;
};

@Controller()
export class RefreshController {
  constructor(readonly endpointService: RefreshService) {}

  @Post()
  async handle(
    @Cookies('loggedIn') loggedIn: string | undefined,
    @Cookies('refreshToken') refreshToken: string | undefined,

    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const values = {
      jwtService: this.endpointService.jwtService,
      loggedIn,
      refreshToken,
      reply,
    } as EndpointValues;

    // Check if loggedIn cookie exists

    if (loggedIn == null) {
      throw new HttpException(
        'Missing loggedIn cookie.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check if refresh token exists

    if (refreshToken == null) {
      throw new HttpException(
        'No refresh token received.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!(await this.endpointService.verifyJwt(values))) {
      await this.endpointService.invalidateSession(values);

      throw new HttpException('Invalid refresh token.', HttpStatus.FORBIDDEN);
    }

    values.session = (await this.endpointService.getSession(values))!;

    if (await this.endpointService.wasSessionInvalidated(values)) {
      throw new HttpException('Session was invalidated.', HttpStatus.FORBIDDEN);
    }

    await this.endpointService.generateValues(values);
    await this.endpointService.updateSessionInDb(values);
    await this.endpointService.updateUserCookies(values);

    return await this.endpointService.createResponse(values);
  }
}

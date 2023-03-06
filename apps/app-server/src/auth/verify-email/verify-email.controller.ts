import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { VerifyEmailService } from './verify-email.service';

@Controller(':emailVerificationCode')
export class VerifyEmailController {
  constructor(readonly endpointService: VerifyEmailService) {}

  @Post()
  async handle(@Param('emailVerificationCode') emailVerificationCode: string) {
    if (!(await this.endpointService.tryVerifyEmail(emailVerificationCode))) {
      throw new HttpException(
        'Invalid email verification code.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

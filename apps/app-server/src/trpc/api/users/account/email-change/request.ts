import { encryptUserEmail, hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { padZeroes } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { randomInt } from 'crypto';
import { once } from 'lodash';
import { sendMail } from 'src/mail';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    oldLoginHash: z.instanceof(Uint8Array),

    newEmail: z
      .string()
      .email()
      .transform((email) => email.toLowerCase()),
  }),
);

export const requestProcedure = once(() => baseProcedure.mutation(request));

export async function request({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Assert correct password

        await ctx.assertCorrectUserPassword({
          userId: ctx.userId,
          loginHash: input.oldLoginHash,
        });

        // Assert non-demo account

        await ctx.assertNonDemoAccount({ userId: ctx.userId });

        // Check email in use

        if (
          (await UserModel.query()
            .where('email_hash', Buffer.from(hashUserEmail(input.newEmail)))
            .select(1)
            .first()) != null
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email is already in use',
          });
        }

        // Send verification email

        const emailVerificationCode = padZeroes(randomInt(0, 1000000), 6);

        await ctx.dataAbstraction.patch(
          'user',
          ctx.userId,
          {
            encrypted_new_email: encryptUserEmail(input.newEmail),
            email_verification_code: emailVerificationCode,
          },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);

        // Send email

        if (process.env.SEND_EMAILS !== 'false') {
          await sendMail({
            from: {
              name: 'DeepNotes',
              email: 'account@deepnotes.app',
            },
            to: [input.newEmail],
            subject: 'Verify your email address',
            html: `
              Use the following code to verify your email address: <b>${emailVerificationCode}</b>.<br/>
              If you did not request this action, you can safely ignore this email.
            `,
          });
        } else {
          return {
            emailVerificationCode,
          };
        }
      });
    },
  );
}

import type { DeepnotesDb } from "@deepnotes/db/client";
import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { users } from "@deepnotes/db/schema";

import type { SessionEnv } from "./env.js";
import { hashUserEmail } from "./email-hash.js";
import { SessionError } from "./errors.js";
import { sendRegistrationEmail } from "./send-registration-email.js";

/**
 * Replaces legacy `users.account.resendVerificationEmail` (public, email in body).
 */
export async function performResendEmailVerification(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  email: string;
}): Promise<void> {
  if (input.env.SEND_EMAILS === "false") {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Email sending is disabled (SEND_EMAILS=false); cannot resend verification.",
    );
  }

  const email = input.email.trim().toLowerCase();
  const exceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";
  const emailHash = Buffer.from(
    await hashUserEmail(email, input.env.USER_EMAIL_SECRET, exceptions),
  );

  const rows = await input.db
    .select({
      emailVerified: users.emailVerified,
      emailVerificationCode: users.emailVerificationCode,
    })
    .from(users)
    .where(eq(users.emailHash, emailHash))
    .limit(1);

  const row = rows[0];
  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }
  if (row.emailVerified) {
    throw new SessionError(
      409,
      "CONFLICT",
      "Email already registered.",
    );
  }
  if (
    row.emailVerificationCode == null ||
    row.emailVerificationCode.length === 0
  ) {
    throw new SessionError(
      500,
      "SERVER_ERROR",
      "Missing email verification state.",
    );
  }

  await sendRegistrationEmail({
    env: input.env,
    toEmail: email,
    emailVerificationCode: row.emailVerificationCode,
  });
}

/**
 * Replaces legacy `users.account.verifyEmail` (public, nanoid code).
 * Promotes `encrypted_new_email` → `encrypted_email` (same as legacy `ref` patch).
 */
export async function performConfirmEmailVerification(input: {
  db: DeepnotesDb;
  body: { emailVerificationCode: string };
}): Promise<void> {
  const code = input.body.emailVerificationCode;

  const result = await input.db
    .update(users)
    .set({
      encryptedEmail: sql`encrypted_new_email`,
      encryptedNewEmail: null,
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpirationDate: null,
    })
    .where(
      and(
        eq(users.emailVerified, false),
        eq(users.emailVerificationCode, code),
        gt(users.emailVerificationExpirationDate, new Date().toISOString()),
        isNotNull(users.encryptedNewEmail),
      ),
    )
    .returning({ id: users.id });

  if (result.length !== 1) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Invalid email verification code.",
    );
  }
}

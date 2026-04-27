import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";

function sendEmailsEnabled(env: SessionEnv): boolean {
  return env.SEND_EMAILS !== "false";
}

/**
 * 6-digit code email for `users.account.emailChange.request` (Resend), legacy-style copy.
 */
export async function sendEmailChangeVerificationEmail(input: {
  env: SessionEnv;
  toEmail: string;
  emailVerificationCode: string;
}): Promise<void> {
  if (!sendEmailsEnabled(input.env)) {
    return;
  }
  const key = input.env.RESEND_API_KEY?.trim();
  if (key == null || key.length === 0) {
    throw new SessionError(
      503,
      "SERVICE_UNAVAILABLE",
      "RESEND_API_KEY is required to send email change verification.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "DeepNotes <account@deepnotes.app>",
      to: [input.toEmail],
      subject: "Verify your email address",
      html: `Use the following code to verify your email address: <b>${input.emailVerificationCode}</b>.<br/>
If you did not request this action, you can safely ignore this email.`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SessionError(
      502,
      "EMAIL_SEND_FAILED",
      `Resend request failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
}

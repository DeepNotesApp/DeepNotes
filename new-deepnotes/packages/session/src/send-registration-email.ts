import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";

function sendEmailsEnabled(env: SessionEnv): boolean {
  return env.SEND_EMAILS !== "false";
}

export function assertOutboundEmailConfiguredForRegistration(env: SessionEnv): void {
  if (!sendEmailsEnabled(env)) {
    return;
  }
  const key = env.RESEND_API_KEY?.trim();
  if (key == null || key.length === 0) {
    throw new SessionError(
      503,
      "SERVICE_UNAVAILABLE",
      "RESEND_API_KEY is required when outbound email is enabled (SEND_EMAILS is not false).",
    );
  }
}

/**
 * Sends the legacy-style registration verification link via Resend.
 * When `SEND_EMAILS=false`, is a no-op.
 */
export async function sendRegistrationEmail(input: {
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
      "RESEND_API_KEY is required to send verification email.",
    );
  }

  const base =
    (input.env.PUBLIC_APP_URL ?? "https://deepnotes.app").replace(/\/$/, "");
  const verifyUrl = `${base}/verify-email/${input.emailVerificationCode}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "DeepNotes <account@deepnotes.app>",
      to: [input.toEmail],
      subject: "Complete your registration",
      html: `Visit the following link to verify your email address:<br/>
<a href="${verifyUrl}">${verifyUrl}</a><br/>
The link above expires in 1 hour.`,
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

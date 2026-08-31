/**
 * Outbound email. With RESEND_API_KEY set it goes through Resend's REST API;
 * without it (local dev) the message is printed to the server log so flows
 * stay testable. No SDK, no other third parties.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  delivered: boolean;
  reason?: string;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ade & P <onboarding@resend.dev>";
  if (!key) {
    console.info(`[email not configured] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { delivered: false, reason: "RESEND_API_KEY is not set" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text, html: message.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`email send failed (${res.status}): ${body.slice(0, 300)}`);
      return { delivered: false, reason: `Resend responded ${res.status}` };
    }
    return { delivered: true };
  } catch (e) {
    console.error("email send failed", e);
    return { delivered: false, reason: "network error" };
  }
}

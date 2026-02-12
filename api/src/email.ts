// Email service using MailChannels API (free for Cloudflare Workers)
// Requires SPF record: v=spf1 include:_spf.mx.cloudflare.net ~all
// And DKIM setup for production

export interface EmailEnv {
  EMAIL_FROM?: string; // e.g., "noreply@thebaycity.dev"
  EMAIL_FROM_NAME?: string; // e.g., "Thebaycity IoT"
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

const MAILCHANNELS_API = "https://api.mailchannels.net/tx/v1/send";

export async function sendEmail(
  env: EmailEnv,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const fromEmail = env.EMAIL_FROM || "noreply@thebaycity.dev";
  const fromName = env.EMAIL_FROM_NAME || "Thebaycity IoT";

  const payload = {
    personalizations: [
      {
        to: [{ email: options.to }],
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: options.subject,
    content: [
      ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
      ...(options.html ? [{ type: "text/html", value: options.html }] : []),
    ],
  };

  try {
    const response = await fetch(MAILCHANNELS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 202) {
      return { ok: true };
    }

    const text = await response.text();
    console.error("[email][send][error]", { status: response.status, body: text });
    return { ok: false, error: `Email send failed: ${response.status}` };
  } catch (err) {
    console.error("[email][send][exception]", err);
    return { ok: false, error: String(err) };
  }
}

// Pre-built email templates

export function invitationEmailHtml(params: {
  workspaceName: string;
  inviterName?: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}): string {
  const { workspaceName, inviterName, role, inviteLink, expiresAt } = params;
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${workspaceName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Thebaycity IoT</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">You're invited to join ${workspaceName}</h2>

    <p style="color: #4b5563;">
      ${inviterName ? `<strong>${inviterName}</strong> has invited you` : "You've been invited"} to join the <strong>${workspaceName}</strong> workspace as a <strong>${role}</strong>.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      This invitation will expire on <strong>${expiryDate}</strong>.
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      If you can't click the button, copy and paste this link into your browser:<br>
      <a href="${inviteLink}" style="color: #3b82f6; word-break: break-all;">${inviteLink}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>Thebaycity IoT Platform</p>
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</body>
</html>
`;
}

export function invitationEmailText(params: {
  workspaceName: string;
  inviterName?: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}): string {
  const { workspaceName, inviterName, role, inviteLink, expiresAt } = params;
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
You're invited to join ${workspaceName}

${inviterName ? `${inviterName} has invited you` : "You've been invited"} to join the ${workspaceName} workspace as a ${role}.

Accept the invitation by visiting:
${inviteLink}

This invitation will expire on ${expiryDate}.

If you didn't expect this invitation, you can safely ignore this email.

---
Thebaycity IoT Platform
`;
}

export function automationEmailHtml(params: {
  subject: string;
  body: string;
  workspaceName: string;
  automationName: string;
  context?: Record<string, unknown>;
}): string {
  const { subject, body, workspaceName, automationName, context } = params;

  let contextHtml = "";
  if (context && Object.keys(context).length > 0) {
    contextHtml = `
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">Trigger Context</h4>
      <pre style="margin: 0; font-size: 12px; color: #4b5563; overflow-x: auto;">${JSON.stringify(context, null, 2)}</pre>
    </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; border-radius: 12px 12px 0 0;">
    <h2 style="color: white; margin: 0; font-size: 18px;">${workspaceName}</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Automation: ${automationName}</p>
  </div>

  <div style="background: #ffffff; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h3 style="color: #1f2937; margin-top: 0;">${subject}</h3>
    <div style="color: #4b5563;">${body.replace(/\n/g, "<br>")}</div>
    ${contextHtml}
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>Sent by Thebaycity IoT Automation</p>
  </div>
</body>
</html>
`;
}

export function automationEmailText(params: {
  subject: string;
  body: string;
  workspaceName: string;
  automationName: string;
  context?: Record<string, unknown>;
}): string {
  const { subject, body, workspaceName, automationName, context } = params;

  let contextText = "";
  if (context && Object.keys(context).length > 0) {
    contextText = `\n\nTrigger Context:\n${JSON.stringify(context, null, 2)}`;
  }

  return `
${workspaceName} - Automation: ${automationName}

${subject}

${body}
${contextText}

---
Sent by Thebaycity IoT Automation
`;
}

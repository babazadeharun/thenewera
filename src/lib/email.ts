import { sendMail } from './mail/smtp';

/** Backward-compatible facade. All SMTP work is delegated to the existing Mail service. */
export async function sendEmail(options: { to: string; subject: string; text: string; html?: string; fromAddress?: string; fromName?: string }) {
  return sendMail({
    to: [options.to],
    subject: options.subject,
    text: options.text,
    html: options.html,
    fromAddress: options.fromAddress,
    fromName: options.fromName,
  });
}

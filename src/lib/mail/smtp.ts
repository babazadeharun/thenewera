import nodemailer from 'nodemailer';
import { archiveSentCopy, sentCopyWarning } from './sent';

export type SendMailInput = { to:string[]; cc?:string[]; bcc?:string[]; subject?:string; text:string; html?:string; inReplyTo?:string; references?:string; messageId?:string; replyTo?:string; headers?:Record<string,string>; attachments?:Array<{filename:string;content:Buffer;contentType?:string}>; fromAddress?:string; fromName?:string };
function config() {
  const host = process.env.MAIL_SMTP_HOST || process.env.EVENT_EMAIL_HOST || '';
  const port = Number(process.env.MAIL_SMTP_PORT || process.env.EVENT_EMAIL_PORT || 465);
  const user = process.env.MAIL_SMTP_USER || process.env.EVENT_EMAIL_USER || '';
  const password = process.env.MAIL_SMTP_PASSWORD || process.env.EVENT_EMAIL_PASSWORD || '';
  if (!host || !user || !password) throw new Error('MAIL_SMTP_CONFIG_MISSING');
  return { host, port, user, password };
}
export function smtpConfigured() { try { config(); return true; } catch { return false; } }

/** Stream transport keeps Bcc for the private Sent copy; never transmit that header. */
export function withoutBcc(raw: Buffer) {
  const boundary = raw.indexOf('\r\n\r\n');
  if (boundary < 0) throw new Error('MAIL_MIME_INVALID');
  const lines = raw.subarray(0, boundary).toString('latin1').split('\r\n');
  const kept: string[] = []; let skip = false;
  for (const line of lines) {
    if (!/^[ \t]/.test(line)) skip = /^bcc:/i.test(line);
    if (!skip) kept.push(line);
  }
  return Buffer.concat([Buffer.from(kept.join('\r\n') + '\r\n\r\n', 'latin1'), raw.subarray(boundary + 4)]);
}
export async function sendMail(input: SendMailInput) {
  const c = config();
  const from = input.fromAddress || process.env.MAIL_FROM_ADDRESS || c.user;
  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
  const prepared = await composer.sendMail({ from: { name: input.fromName || process.env.MAIL_FROM_NAME || 'New Era', address: from }, to: input.to, cc: input.cc, bcc: input.bcc, subject: input.subject || '', text: input.text, html: input.html, inReplyTo: input.inReplyTo, references: input.references, messageId: input.messageId, replyTo: input.replyTo, headers: input.headers, attachments: input.attachments, disableFileAccess: true, disableUrlAccess: true });
  if (!Buffer.isBuffer(prepared.message)) throw new Error('MAIL_MIME_INVALID');
  const transporter = nodemailer.createTransport({ host: c.host, port: c.port, secure: String(process.env.MAIL_SMTP_SECURE ?? (c.port === 465)).toLowerCase() !== 'false', auth: { user: c.user, pass: c.password }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 });
  const result = await transporter.sendMail({ envelope: prepared.envelope, raw: withoutBcc(prepared.message) });
  // Copy failure must not turn an accepted SMTP delivery into a failed send/retry.
  let archived = true;
  if (result.accepted?.length) archived = await archiveSentCopy(prepared.messageId, prepared.message);
  return { ...result, messageId: prepared.messageId, sentCopyWarning: archived ? null : sentCopyWarning };
}

import nodemailer from 'nodemailer';

export type SendMailInput = { to:string[]; cc?:string[]; bcc?:string[]; subject?:string; text:string; html?:string; inReplyTo?:string; references?:string; attachments?:Array<{filename:string;content:Buffer;contentType?:string}> };

function config() {
  const host = process.env.MAIL_SMTP_HOST || process.env.EVENT_EMAIL_HOST || '';
  const port = Number(process.env.MAIL_SMTP_PORT || process.env.EVENT_EMAIL_PORT || 465);
  const user = process.env.MAIL_SMTP_USER || process.env.EVENT_EMAIL_USER || '';
  const password = process.env.MAIL_SMTP_PASSWORD || process.env.EVENT_EMAIL_PASSWORD || '';
  if (!host || !user || !password) throw new Error('MAIL_SMTP_CONFIG_MISSING');
  return {host,port,user,password};
}

export function smtpConfigured() { try { config(); return true; } catch { return false; } }

export async function sendMail(input: SendMailInput) {
  const c = config();
  const from = process.env.MAIL_FROM_ADDRESS || c.user;
  const fromName = process.env.MAIL_FROM_NAME || 'New Era';
  const transporter = nodemailer.createTransport({ host:c.host, port:c.port, secure:String(process.env.MAIL_SMTP_SECURE ?? (c.port===465)).toLowerCase() !== 'false', auth:{user:c.user,pass:c.password}, connectionTimeout:15000, greetingTimeout:15000, socketTimeout:20000 });
  return transporter.sendMail({ from:`${fromName} <${from}>`, to:input.to, cc:input.cc, bcc:input.bcc, subject:input.subject || '', text:input.text, html:input.html, inReplyTo:input.inReplyTo, references:input.references, attachments:input.attachments?.map(a=>({filename:a.filename,content:a.content,contentType:a.contentType})) });
}

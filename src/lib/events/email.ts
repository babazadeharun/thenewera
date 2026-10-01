import nodemailer from 'nodemailer';

function getEventEmailTransporter() {
  const host = process.env.EVENT_EMAIL_HOST;
  const port = Number(process.env.EVENT_EMAIL_PORT || 587);
  const user = process.env.EVENT_EMAIL_USER;
  const password = process.env.EVENT_EMAIL_PASSWORD;

  if (!host || !user || !password) {
    throw new Error('EVENT_EMAIL_SMTP_CONFIG_MISSING');
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('EVENT_EMAIL_SMTP_PORT_INVALID');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: password,
    },
  });
}

export async function sendEventEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const transporter = getEventEmailTransporter();

  return transporter.sendMail({
    from: process.env.EVENT_EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {}),
  });
}

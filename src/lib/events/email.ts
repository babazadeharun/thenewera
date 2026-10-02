import { sendEmail } from '@/lib/email';

export async function sendEventEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  return sendEmail(options);
}

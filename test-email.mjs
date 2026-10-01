import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EVENT_EMAIL_HOST,
  port: Number(process.env.EVENT_EMAIL_PORT || 465),
  secure: true,
  auth: {
    user: process.env.EVENT_EMAIL_USER,
    pass: process.env.EVENT_EMAIL_PASSWORD,
  },
});

await transporter.verify();

console.log('SMTP connection successful.');
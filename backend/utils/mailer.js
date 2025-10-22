// backend/utils/mailer.js
const nodemailer = require('nodemailer');

function makeTransport() {
  // 1️⃣ Gmail OAuth2
  if (
    process.env.EMAIL_SERVICE === 'gmail' &&
    process.env.EMAIL_CLIENT_ID &&
    process.env.EMAIL_CLIENT_SECRET &&
    process.env.EMAIL_REFRESH_TOKEN &&
    process.env.EMAIL_USER
  ) {
    console.log('[MAIL] Using Gmail OAuth2 transport');
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
      },
    });
    return t;
  }

  // 2️⃣ Gmail (App Password - fallback)
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('[MAIL] Using Gmail SMTP (App Password)');
    const port = Number(process.env.EMAIL_PORT || 587);
    const secure =
      port === 465 ||
      String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true';
    const t = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
      port,
      secure,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    return t;
  }

  // 3️⃣ Generic SMTP (e.g., Mailtrap)
  if (process.env.SMTP_HOST) {
    console.log('[MAIL] Using generic SMTP transport');
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    return t;
  }

  // 4️⃣ Dev fallback: logs emails to console only
  console.warn('[MAIL] No email configuration found. Using DEV console transport.');
  return {
    sendMail: async ({ to, subject, text, html }) => {
      console.log('✉️ [DEV MAIL]');
      console.log('To:', to);
      console.log('Subject:', subject);
      if (text) console.log('Text:', text);
      if (html) console.log('HTML:', html);
      return { accepted: [to] };
    },
  };
}

const transporter = makeTransport();

async function sendMail({ to, subject, html, text, from, replyTo }) {
  const defaultFrom =
    process.env.EMAIL_FROM ||
    (process.env.EMAIL_USER ? `"AeroJob" <${process.env.EMAIL_USER}>` : '"AeroJob" <no-reply@aerojob.space>');

  return transporter.sendMail({
    from: from || defaultFrom,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

// Verify transporter connection on startup
transporter
  .verify()
  .then(() => console.log('[MAIL] Ready to send emails ✅'))
  .catch((err) => console.error('[MAIL] Verify failed ❌:', err.message));

module.exports = { sendMail, transporter };

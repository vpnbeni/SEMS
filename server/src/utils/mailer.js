const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedConfigKey = null;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from || !Number.isFinite(port) || port <= 0) {
    throw new Error(
      'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM (or EMAIL_* equivalents).'
    );
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
};

const getTransporter = () => {
  const config = getSmtpConfig();
  const configKey = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: config.pass,
  });

  if (cachedTransporter && cachedConfigKey === configKey) {
    return { transporter: cachedTransporter, from: config.from };
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  cachedConfigKey = configKey;

  return { transporter: cachedTransporter, from: config.from };
};

const sendMail = async ({ to, subject, text, html }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error('sendMail requires to, subject, and text or html');
  }

  const { transporter, from } = getTransporter();

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendMail,
};

const axios = require('axios');
const env = require('../config/env');
const { buildResultEmail } = require('../emails/resultEmail');

const RESEND_URL = 'https://api.resend.com/emails';

const urls = () => ({
  site: env.siteUrl,
  app: env.appUrl,
  logo: `${env.siteUrl}/assets/img/trafy-logo.png`,
});

/** Low-level send. Returns { sent, id?, reason? } and never throws. */
async function send({ to, subject, html, text }) {
  if (!env.resendApiKey) {
    console.log(`[email] RESEND_API_KEY not set; not sending "${subject}" to ${to}`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const { data } = await axios.post(
      RESEND_URL,
      { from: env.emailFrom, to: [to], reply_to: env.emailReplyTo, subject, html, text },
      { headers: { Authorization: `Bearer ${env.resendApiKey}` }, timeout: 15000 }
    );
    return { sent: true, id: data && data.id };
  } catch (err) {
    const detail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[email] send to ${to} failed:`, detail);
    return { sent: false, reason: 'provider_error' };
  }
}

/** Renders and sends the result email for a finished attempt. */
async function sendResultEmail(data) {
  const { subject, html, text } = buildResultEmail({ ...data, urls: urls() });
  return send({ to: data.to, subject, html, text });
}

module.exports = { sendResultEmail, send, urls };

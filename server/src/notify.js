import nodemailer from 'nodemailer';
import { config } from './config.js';
import { ApiError, text } from './errors.js';
import { requireUser } from './auth.js';
import { readProfile } from './records.js';

export async function weekApproved(userId) {
  try {
    await deliver(userId, 'Your new week is ready', 'You approved a new MyOrbit week. Open the app to follow the timetable.');
  } catch (error) {
    console.warn('Week approval notice was not delivered:', error.message);
  }
}

export async function sendTest(userId) {
  const profile = await readProfile(userId);
  const emailOn = flag(profile, 'email') && config.mailConfigured();
  const smsOn = flag(profile, 'sms') && config.smsConfigured();
  if (!emailOn && !smsOn) {
    throw new ApiError(400, 'Turn on email or phone in Settings, then fill SMTP or SMS_WEBHOOK_URL in server/.env.');
  }
  await deliver(userId, 'MyOrbit test', 'This is a test from MyOrbit. This channel is turned on.');
}

async function deliver(userId, subject, body) {
  const user = await requireUser(userId);
  const profile = await readProfile(userId);
  if (!profile) return;
  if (flag(profile, 'email')) await sendMail(user.email, subject, body);
  if (flag(profile, 'sms')) await sendWebhook(user.email, text(profile.phone), body);
}

async function sendMail(to, subject, textBody) {
  if (!config.mailConfigured() || !to) return;
  const transport = nodemailer.createTransport({
    host: config.mailHost,
    port: config.mailPort,
    secure: config.mailPort === 465,
    auth: { user: config.mailUsername, pass: config.mailPassword },
    requireTLS: config.mailStartTls
  });
  try {
    await transport.sendMail({
      from: config.mailFrom || config.mailUsername,
      to,
      subject,
      text: textBody
    });
  } catch {
    throw new ApiError(502, 'The mail server refused the message. Check the SMTP values in server/.env.');
  }
}

async function sendWebhook(email, phone, textBody) {
  if (!config.smsConfigured()) return;
  try {
    const response = await fetch(config.smsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, text: textBody }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch {
    throw new ApiError(502, 'The phone webhook did not accept the message. Check SMS_WEBHOOK_URL.');
  }
}

function flag(profile, key) {
  const notes = profile?.notifications;
  if (!notes || typeof notes !== 'object') return false;
  return notes[key] === true || notes[key] === 'true';
}

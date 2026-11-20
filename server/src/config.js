import 'dotenv/config';

function blank(value) {
  return value == null || String(value).trim() === '';
}

const smsWebhookUrl = process.env.SMS_WEBHOOK_URL || '';

export const config = {
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myorbit',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-this-secret',
  frontendOrigin: process.env.FRONTEND_ORIGIN || '',
  llmUrl: process.env.LLM_URL || '',
  llmKey: process.env.LLM_KEY || '',
  llmModel: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
  smsWebhookUrl,
  mailHost: process.env.MAIL_HOST || '',
  mailPort: Number(process.env.MAIL_PORT || 587),
  mailUsername: process.env.MAIL_USERNAME || '',
  mailPassword: process.env.MAIL_PASSWORD || '',
  mailFrom: process.env.MAIL_FROM || '',
  mailStartTls: String(process.env.MAIL_STARTTLS || 'true') !== 'false',
  mailConfigured() {
    return !blank(this.mailHost) && !blank(this.mailUsername);
  },
  llmConfigured() {
    return !blank(this.llmUrl) && !blank(this.llmKey);
  },
  smsConfigured() {
    return smsWebhookUrl.startsWith('https://') || smsWebhookUrl.startsWith('http://');
  }
};

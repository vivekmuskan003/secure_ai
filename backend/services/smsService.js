/**
 * services/smsService.js — SMS OTP via Twilio
 *
 * Falls back to console.log if Twilio credentials are not set.
 * This lets you develop and test without a Twilio account.
 *
 * Setup (optional):
 *  1. Create account at twilio.com
 *  2. Get a phone number
 *  3. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE in .env
 */

let _twilioClient = null;

const getTwilioClient = () => {
  if (_twilioClient) return _twilioClient;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  const twilio = require('twilio');
  _twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return _twilioClient;
};

/**
 * sendSMS — Send an OTP via SMS
 *
 * @param {string} phone - E.164 format phone number (e.g. +919876543210)
 * @param {string} otp - 6-digit code
 * @returns {Promise<{ success: boolean, dev?: boolean }>}
 */
const sendSMS = async (phone, otp) => {
  const message = `Your Secure AI Platform OTP is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

  const client = getTwilioClient();

  if (!client) {
    // Dev mode — print OTP to console
    console.log(`\n📱 [DEV SMS] To: ${phone}`);
    console.log(`   OTP: ${otp}\n`);
    return { success: true, dev: true };
  }

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });

  console.log(`[SMS] OTP sent to ${phone} ✅`);
  return { success: true };
};

module.exports = { sendSMS };

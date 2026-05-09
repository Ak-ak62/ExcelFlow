const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function buildOtpEmailTemplate(otp, username) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>OTP Verification</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1a3c6e,#2d6cbe);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">EXCEL DATA VIEWER</h1>
                  <p style="margin:8px 0 0;color:#a8c4e8;font-size:13px;letter-spacing:0.5px;">Secure Account Verification</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;font-size:16px;color:#333;font-weight:600;">Hello, ${username}</p>
                  <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.7;">
                    You requested to verify your account. Use the one-time password below to complete your verification. This code expires in <strong>10 minutes</strong>.
                  </p>
                  <!-- OTP Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <div style="display:inline-block;background:#f0f5ff;border:2px dashed #2d6cbe;border-radius:10px;padding:20px 48px;">
                          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a3c6e;">${otp}</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
                    If you did not request this verification, please ignore this email. Your account remains secure.
                  </p>
                  <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                    Do not share this OTP with anyone.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8f9fc;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#aaa;">Excel Data Viewer &mdash; This is an automated email, please do not reply.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function sendOtpEmail(toEmail, otp, username) {
  await transporter.sendMail({
    from: `"Excel Data Viewer" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your OTP Verification Code',
    html: buildOtpEmailTemplate(otp, username)
  });
}

module.exports = { sendOtpEmail };
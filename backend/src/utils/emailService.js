// utils/mailer.js
import nodemailer from 'nodemailer';

export async function sendEmail(to, type, link) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let subject, html;

    if (type === 'invite') {
      subject = "You're invited to join a Tenant";
      html = `
        <h2>Welcome!</h2>
        <p>You’ve been invited to join a tenant on our platform.</p>
        <p>Click below to accept the invite and set your password:</p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:6px;">
          Accept Invite
        </a>
        <p>This link will expire in 24 hours.</p>
      `;
    } else if (type === 'reset') {
      subject = 'Password Reset Request';
      html = `
        <h2>Password Reset</h2>
        <p>We received a request to reset your password.</p>
        <p>Click below to reset it (valid for 30 minutes):</p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p>If you did not request this, you can safely ignore this email.</p>
      `;
    } else {
      throw new Error('Unknown email type');
    }

    const mailOptions = {
      from: `"AI Agent Platform" <${
        process.env.MAIL_FROM || 'no-reply@example.com'
      }>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`${type} email sent:`, info.messageId);

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending email:', err);
    return { ok: false, error: err.message };
  }
}

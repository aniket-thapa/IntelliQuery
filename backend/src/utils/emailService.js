import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';

// --- Nodemailer Transporter Setup ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // Use `true` for port 465, `false` for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- Reusable Professional HTML Email Template ---
const EmailTemplate = ({ title, bodyContent, buttonLink, buttonText }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #374151; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .content { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; }
        .content h2 { color: #111827; font-size: 24px; margin-top: 0; }
        .content p { font-size: 16px; line-height: 1.6; margin: 16px 0; }
        .button { display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #6B7280; }
    </style>
</head>
<body>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" class="container">
                    <tr>
                        <td class="header">
                            <svg width="250" height="64" viewBox="0 0 250 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g transform="translate(18, 7) scale(2.2)" stroke="#0891B2" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="#0891B2" fill-opacity="0.1">
                                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                                <path d="M9 13a4.5 4.5 0 0 0 3-4"/>
                                <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
                                <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
                                <path d="M6 18a4 4 0 0 1-1.967-.516"/>
                                <path d="M12 13h4"/>
                                <path d="M12 18h6a2 2 0 0 1 2 2v1"/>
                                <path d="M12 8h8"/>
                                <path d="M16 8V5a2 2 0 0 1 2-2"/>
                                <circle cx="16" cy="13" r=".5"/>
                                <circle cx="18" cy="3" r=".5"/>
                                <circle cx="20" cy="21" r=".5"/>
                                <circle cx="20" cy="8" r=".5"/>
                            </g>
                            <text x="82" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="bold" fill="#111827" style="letter-spacing: -0.5px;">
                                IntelliQuery
                            </text>
                            <text x="82" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" fill="#6B7280">
                                AI Data Analyst
                            </text>
                          </svg>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            <h2>${title}</h2>
                            ${bodyContent}
                            <a href="${buttonLink}" class="button" style="color: #ffffff;">${buttonText}</a>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p>&copy; ${new Date().getFullYear()} IntelliQuery. All rights reserved.</p>
                            <p>If you did not request this email, you can safely ignore it.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

// --- Main Email Sending Function ---
export async function sendEmail(to, type, link) {
  try {
    let subject, title, bodyContent, buttonText;

    switch (type) {
      case 'invite':
        subject = "You're invited to join an IntelliQuery workspace";
        title = "You're Invited!";
        bodyContent = `
            <p>You’ve been invited to join a workspace on IntelliQuery, the AI Data Analyst for MongoDB.</p>
            <p>Click the button below to accept the invitation and set up your account. This link will expire in 24 hours.</p>
        `;
        buttonText = 'Accept Invite';
        break;

      case 'reset':
        subject = 'Reset Your IntelliQuery Password';
        title = 'Password Reset Request';
        bodyContent = `
            <p>We received a request to reset the password for your IntelliQuery account.</p>
            <p>Click the button below to choose a new password. This link is valid for 30 minutes.</p>
        `;
        buttonText = 'Reset Password';
        break;

      default:
        throw new Error('Unknown email type provided');
    }

    const html = EmailTemplate({
      title,
      bodyContent,
      buttonLink: link,
      buttonText,
    });

    const mailOptions = {
      from: `"IntelliQuery" <${
        process.env.MAIL_FROM || process.env.SMTP_USER
      }>`,
      to,
      subject,
      html,
      text: htmlToText(html),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`${type} email sent:`, info.messageId);

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending email:', err);
    return { ok: false, error: err.message };
  }
}

// Email service using nodemailer
// Make sure you have valid SMTP_* variables in your .env file
const nodemailer = require('nodemailer');

// Normalise env values
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM =
  process.env.SMTP_FROM ||
  (SMTP_USER ? SMTP_USER : 'fluxmart35@gmail.com');

// Create transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for others
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

// Log configuration problems early instead of silently doing nothing
if (!SMTP_USER || !SMTP_PASS) {
  console.warn(
    '[emailService] SMTP_USER or SMTP_PASS is missing. Emails will NOT be sent. ' +
      'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) in server/.env.'
  );
}

// Verify transporter on startup to catch mis‑configuration
transporter.verify((err, success) => {
  if (err) {
    console.error(
      '[emailService] SMTP configuration is invalid. Emails will fail to send:',
      err.message || err
    );
  } else {
    console.log('[emailService] SMTP server is ready to take messages.');
  }
});

const sendOrderConfirmationEmail = async (userEmail, orders) => {
  try {
    const orderDetails = orders.map(order => {
      const items = order.orderItems.map(item => 
        `- ${item.name} x${item.quantity} - ${item.price * item.quantity}`
      ).join('\n');
      
      return `
Order #${order._id}
Items:
${items}
Total: ${order.totalPrice} PKR
Status: ${order.status}
      `;
    }).join('\n\n');

    const mailOptions = {
      from: SMTP_FROM,
      to: userEmail,
      subject: 'Order Confirmation',
      html: `
        <h2>Thank you for your order!</h2>
        <p>Your order has been confirmed and will be processed shortly.</p>
        <pre>${orderDetails}</pre>
        <p>You can track your order status in your account dashboard.</p>
      `
    };

    // Only send if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log('Email would be sent:', mailOptions);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendOrderStatusUpdateEmail = async (userEmail, order) => {
  try {
    const mailOptions = {
      from: SMTP_FROM,
      to: userEmail,
      subject: `Order #${order._id} Status Update`,
      html: `
        <h2>Order Status Update</h2>
        <p>Your order #${order._id} status has been updated to: <strong>${order.status}</strong></p>
        ${order.trackingNumber ? `<p>Tracking Number: <strong>${order.trackingNumber}</strong></p>` : ''}
        <p>You can view more details in your account dashboard.</p>
      `
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log('Email would be sent:', mailOptions);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendPasswordResetEmail = async (userEmail, resetUrl) => {
  try {
    const mailOptions = {
      from: SMTP_FROM,
      to: userEmail,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy and paste this link in your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log('Password reset email would be sent:', mailOptions);
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

const sendContactEmail = async (name, email, subject, message, attachmentInfo = null) => {
  try {
    const mailOptions = {
      from: SMTP_FROM,
      to: SMTP_FROM, // Send to admin email
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ${attachmentInfo ? `<p><strong>Attachment:</strong> ${attachmentInfo.filename}</p>` : ''}
        <hr>
        <p><strong>Reply to:</strong> <a href="mailto:${email}">${email}</a></p>
      `,
      attachments: attachmentInfo ? [
        {
          filename: attachmentInfo.filename,
          path: attachmentInfo.path
        }
      ] : []
    };

    // Also send confirmation to user
    const confirmationMailOptions = {
      from: SMTP_FROM,
      to: email,
      subject: 'We received your message - FluxMart Support',
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Hi ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ${attachmentInfo ? `<p><strong>You attached:</strong> ${attachmentInfo.filename}</p>` : ''}
        <hr>
        <p>Best regards,<br>FluxMart Support Team</p>
      `
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      await transporter.sendMail(confirmationMailOptions);
    } else {
      console.log('Contact emails would be sent:', { mailOptions, confirmationMailOptions });
    }
  } catch (error) {
    console.error('Error sending contact email:', error);
    throw error;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendPasswordResetEmail,
  sendContactEmail
};


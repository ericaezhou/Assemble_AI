const nodemailer = require('nodemailer');

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes = new Map();

// Configure email transporter
// For development, you can use Gmail with an app-specific password
// or use a service like SendGrid, Mailgun, etc. for production
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Email sending will be simulated.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use app-specific password for Gmail
    }
  });
};

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code to email
const sendVerificationCode = async (email) => {
  const code = generateVerificationCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes

  // Store the code with expiration
  verificationCodes.set(email, { code, expiresAt });

  const transporter = createTransporter();

  // If no transporter configured, log the code instead (for development)
  if (!transporter) {
    console.log('='.repeat(50));
    console.log(`DEVELOPMENT MODE: Verification code for ${email}`);
    console.log(`CODE: ${code}`);
    console.log(`Expires at: ${new Date(expiresAt).toLocaleString()}`);
    console.log('='.repeat(50));
    return { success: true, devMode: true, code }; // Return code in dev mode for testing
  }

  // Send email in production
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Research Connect - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Research Connect Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #6B7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification code sent to ${email}`);
    return { success: true, devMode: false };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Verify the code entered by user
const verifyCode = (email, code) => {
  const stored = verificationCodes.get(email);

  if (!stored) {
    return { valid: false, message: 'No verification code found. Please request a new code.' };
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return { valid: false, message: 'Verification code has expired. Please request a new code.' };
  }

  if (stored.code !== code) {
    return { valid: false, message: 'Invalid verification code. Please try again.' };
  }

  // Code is valid, remove it so it can't be reused
  verificationCodes.delete(email);
  return { valid: true, message: 'Email verified successfully!' };
};

// Clean up expired codes periodically (run every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(email);
    }
  }
}, 15 * 60 * 1000);

module.exports = {
  sendVerificationCode,
  verifyCode
};

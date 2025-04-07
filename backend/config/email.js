const nodemailer = require('nodemailer');

// Verify required environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Missing required email configuration. Please set EMAIL_USER and EMAIL_PASS environment variables.');
  process.exit(1);
}

// Configure email transporter with Gmail-specific settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add additional configuration for better reliability
  pool: true, // Use pooled connections
  maxConnections: 3, // Maximum number of simultaneous connections
  maxMessages: 50, // Maximum number of messages per connection
  rateDelta: 1000, // Time window for rate limiting (1 second)
  rateLimit: 3, // Maximum number of messages per time window
  // Add Gmail-specific settings
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
const verifyTransporter = async () => {
  try {
    const verify = await transporter.verify();
    console.log('Email transporter is configured correctly and ready to send emails');
    return verify;
  } catch (error) {
    console.error('Email transporter verification failed:', {
      error: error.message,
      stack: error.stack
    });
    // Don't exit the process, but log the error
    console.error('Email functionality may not work correctly. Please check your configuration.');
    return false;
  }
};

// Verify the configuration immediately
verifyTransporter();

module.exports = transporter;
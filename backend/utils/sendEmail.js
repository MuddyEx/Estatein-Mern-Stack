const transporter = require('../config/email');

const sendEmail = async (to, subject, text) => {
  try {
    console.log('Attempting to send email:', {
      to,
      subject,
      from: process.env.EMAIL_USER
    });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration is missing. Please check EMAIL_USER and EMAIL_PASS environment variables.');
    }

    const mailOptions = {
      from: `"Estatien" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to,
      subject
    });

    return info;
  } catch (error) {
    console.error('Error sending email:', {
      error: error.message,
      stack: error.stack,
      to,
      subject
    });
    throw error;
  }
};

module.exports = sendEmail;
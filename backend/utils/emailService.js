const nodemailer = require('nodemailer');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email template for property reports
const generateReportEmailTemplate = (reportData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4c1d95; color: white; padding: 20px; border-radius: 5px; }
        .content { background: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 20px; }
        .section { margin-bottom: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Property Report Received</h2>
        </div>
        <div class="content">
          <div class="section">
            <h3>Reporter Information</h3>
            <p><strong>Name:</strong> ${reportData.userName}</p>
            <p><strong>Email:</strong> ${reportData.userEmail}</p>
            <p><strong>Date:</strong> ${new Date(reportData.reportDate).toLocaleString()}</p>
          </div>
          
          <div class="section">
            <h3>Property Information</h3>
            <p><strong>Title:</strong> ${reportData.propertyTitle}</p>
            <p><strong>Location:</strong> ${reportData.propertyLocation}</p>
            <p><strong>Property ID:</strong> ${reportData.propertyId}</p>
          </div>
          
          <div class="section">
            <h3>Report Details</h3>
            <p><strong>Reason:</strong> ${reportData.reason.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Additional Details:</strong></p>
            <p style="background: #fff; padding: 10px; border-radius: 5px;">${reportData.details}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from your property management system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to send report email
const sendReportEmail = async (reportData) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `Property Report: ${reportData.propertyTitle}`,
      html: generateReportEmailTemplate(reportData)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Report email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending report email:', error);
    throw error;
  }
};

module.exports = {
  sendReportEmail
}; 
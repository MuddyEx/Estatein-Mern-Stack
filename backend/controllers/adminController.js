const Agent = require('../models/Agent');
const Apartment = require('../models/Apartment');
const Report = require('../models/Report');
const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('../config/cloudinary');

// Create admin account
const createAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      email,
      password: hashedPassword,
      verified: true // Admin accounts are auto-verified
    });

    console.log(`Admin created: ${admin.email}`);
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.log(`Error in createAdmin: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate an agent (approve or reject)
const validateAgent = async (req, res) => {
  const { status, reason } = req.body;
  const { agentId } = req.params;

  try {
    console.log('Validating agent:', { agentId, status, reason });
    
    const agent = await Agent.findById(agentId);
    if (!agent) {
      console.log(`Agent not found: ${agentId}`);
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (status === 'rejected') {
      console.log(`Rejecting agent: ${agentId}`);
      // Delete the agent and their data
      await Agent.findByIdAndDelete(agentId);
      // Delete all apartments associated with this agent
      await Apartment.deleteMany({ agentId });
      
      // Send email notification
      await sendEmail(
        agent.email,
        'Agent Registration Rejected',
        `Sorry, your agent registration has been rejected.\n\nReason: ${reason || 'No reason provided'}`
      );

      console.log(`Agent ${agent.email} rejected and deleted`);
      return res.status(200).json({ message: 'Agent rejected and deleted successfully' });
    } 
    
    if (status === 'approved') {
      console.log(`Approving agent: ${agentId}`);
      agent.status = status;
      if (reason) {
        agent.statusReason = reason;
      }
      await agent.save();

      // Send email notification
      await sendEmail(
        agent.email,
        'Agent Registration Approved',
        'Congratulations! Your agent registration has been approved. You can now log in and start listing properties.'
      );

      console.log(`Agent ${agent.email} approved`);
      return res.status(200).json({ message: 'Agent approved successfully', agent });
    }

    return res.status(400).json({ message: 'Invalid status provided' });
  } catch (error) {
    console.error(`Error in validateAgent: ${error.message}`);
    res.status(500).json({ message: 'Server error during agent validation' });
  }
};

// View all agents
const viewAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find();
    console.log(`Fetched ${agents.length} agents`);
    res.status(200).json(agents);
  } catch (error) {
    console.log(`Error in viewAllAgents: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get agent details
const getAgentDetails = async (req, res) => {
  const { agentId } = req.params;
  
  try {
    const agent = await Agent.findById(agentId).select('-password');
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.status(200).json(agent);
  } catch (error) {
    console.log(`Error in getAgentDetails: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ban or delete agent
const banOrDeleteAgent = async (req, res) => {
  const { agentId, action, reason } = req.body;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (action === 'ban') {
      agent.status = 'banned';
      agent.statusReason = reason;
      await agent.save();

      await sendEmail(
        agent.email,
        'Account Banned',
        `Your agent account has been banned. Reason: ${reason || 'No reason provided'}`
      );

      res.status(200).json({ message: 'Agent banned successfully', agent });
    } else if (action === 'reactivate') {
      agent.status = 'approved';
      agent.statusReason = reason;
      await agent.save();

      await sendEmail(
        agent.email,
        'Account Reactivated',
        `Your agent account has been reactivated. Reason: ${reason || 'No reason provided'}`
      );

      res.status(200).json({ message: 'Agent reactivated successfully', agent });
    } else if (action === 'delete') {
      // Delete the agent and their data
      await Agent.findByIdAndDelete(agentId);
      // Delete all apartments associated with this agent
      await Apartment.deleteMany({ agentId });

      await sendEmail(
        agent.email,
        'Account Deleted',
        `Your agent account has been deleted. Reason: ${reason || 'No reason provided'}`
      );

      res.status(200).json({ message: 'Agent deleted successfully' });
    }
  } catch (error) {
    console.log(`Error in banOrDeleteAgent: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send email to agents
const sendEmailToAgents = async (req, res) => {
  const { agentIds, subject, message } = req.body;

  try {
    if (agentIds && agentIds.length > 0) {
      const agents = await Agent.find({ _id: { $in: agentIds } });
      for (const agent of agents) {
        await sendEmail(agent.email, subject, message);
      }
    } else {
      const allAgents = await Agent.find({ active: true });
      for (const agent of allAgents) {
        await sendEmail(agent.email, subject, message);
      }
    }

    res.status(200).json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.log(`Error in sendEmailToAgents: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending agents
const getPendingAgents = async (req, res) => {
  try {
    const pendingAgents = await Agent.find({ status: 'pending' });
    res.status(200).json(pendingAgents);
  } catch (error) {
    console.log(`Error in getPendingAgents: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    console.log(`Fetched ${users.length} users`);
    res.status(200).json(users);
  } catch (error) {
    console.log(`Error in getAllUsers: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle user status (activate/deactivate)
const deactivateUser = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.active = active;
    await user.save();

    await sendEmail(
      user.email,
      active ? 'Account Activated' : 'Account Deactivated',
      active 
        ? 'Your account has been activated by an administrator. You can now log in and use your account.'
        : 'Your account has been deactivated by an administrator.'
    );

    res.status(200).json({ 
      message: active ? 'User activated successfully' : 'User deactivated successfully',
      user
    });
  } catch (error) {
    console.log(`Error in deactivateUser: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete apartment
const deleteApartment = async (req, res) => {
  const { id } = req.params;

  try {
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    await Apartment.findByIdAndDelete(id);
    res.status(200).json({ message: 'Apartment deleted successfully' });
  } catch (error) {
    console.log(`Error in deleteApartment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reports
const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('userId', 'email')
      .populate('resolvedBy', 'email');
    console.log(`Fetched ${reports.length} reports`);
    res.status(200).json(reports);
  } catch (error) {
    console.log(`Error in getAllReports: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resolve report
const resolveReport = async (req, res) => {
  const { id } = req.params;

  try {
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'resolved';
    report.resolvedDate = new Date();
    report.resolvedBy = req.user.id;
    await report.save();

    // Send email to the user
    const emailText = `
Dear ${report.userName},

Your report regarding the property "${report.propertyTitle}" has been reviewed and resolved by our admin team.

Report Details:
- Property: ${report.propertyTitle}
- Location: ${report.propertyLocation}
- Report Reason: ${report.reason}
- Report Date: ${new Date(report.reportDate).toLocaleDateString()}
- Resolution Date: ${new Date(report.resolvedDate).toLocaleDateString()}

We have carefully reviewed your report and taken appropriate action. If you have any further concerns about this or any other property, please feel free to submit another report.

Thank you for helping us maintain the quality of our platform.

Best regards,
The Admin Team
    `;

    await sendEmail(
      report.userEmail,
      'Your Property Report Has Been Resolved',
      emailText
    );

    res.status(200).json({ message: 'Report resolved successfully' });
  } catch (error) {
    console.log(`Error in resolveReport: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const profilePicture = req.body.profilePicture; // Base64 image
  const adminId = req.user.id;

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (name) {
      admin.name = name;
    }

    if (profilePicture) {
      const result = await cloudinary.uploader.upload(profilePicture, {
        resource_type: 'image',
        width: 500,
        height: 500,
        crop: 'fill',
        gravity: 'face'
      });
      admin.profilePicture = result.secure_url;
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      admin.password = await bcrypt.hash(newPassword, 10);
    }

    await admin.save();
    
    // Return admin data without password
    const adminData = admin.toObject();
    delete adminData.password;
    
    res.status(200).json({ 
      message: 'Profile updated successfully',
      admin: adminData
    });
  } catch (error) {
    console.log(`Error in updateAdminProfile: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve an apartment
const approveApartment = async (req, res) => {
  const { apartmentId } = req.params;
  const { reason } = req.body;

  try {
    const apartment = await Apartment.findById(apartmentId).populate('agentId');
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    apartment.status = 'approved';
    await apartment.save();

    // Send email notification to agent
    await sendEmail(
      apartment.agentId.email,
      'Apartment Listing Approved',
      `Dear ${apartment.agentId.fullName},\n\nYour apartment listing "${apartment.title}" has been approved by the administrator.\n\nComments: ${reason || 'No comments provided'}\n\nYour listing is now visible to users.\n\nBest regards,\nAdmin Team`
    );

    console.log(`Apartment ${apartmentId} approved`);
    res.status(200).json({ message: 'Apartment approved successfully', apartment });
  } catch (error) {
    console.log(`Error in approveApartment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Decline an apartment
const declineApartment = async (req, res) => {
  const { apartmentId } = req.params;
  const { reason } = req.body;

  try {
    const apartment = await Apartment.findById(apartmentId).populate('agentId');
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    apartment.status = 'declined';
    await apartment.save();

    // Send email notification to agent
    await sendEmail(
      apartment.agentId.email,
      'Apartment Listing Declined',
      `Dear ${apartment.agentId.fullName},\n\nYour apartment listing "${apartment.title}" has been declined by the administrator.\n\nReason: ${reason || 'No reason provided'}\n\nPlease review the feedback and make necessary changes before resubmitting.\n\nBest regards,\nAdmin Team`
    );

    console.log(`Apartment ${apartmentId} declined`);
    res.status(200).json({ message: 'Apartment declined successfully', apartment });
  } catch (error) {
    console.log(`Error in declineApartment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log(`No admin found with email ${email}`);
      return res.status(400).json({ message: 'Admin not found' });
    }

    if (admin.otp !== otp) {
      console.log(`Invalid OTP for ${email}`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    admin.verified = true;
    admin.otp = null; // Clear OTP after verification
    await admin.save();

    console.log(`Email verified for admin ${email}`);
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.log(`Error in verifyOTP: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log(`No admin found with email ${email}`);
      return res.status(400).json({ message: 'Admin not found' });
    }

    if (admin.verified) {
      console.log(`Admin ${email} is already verified`);
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    await admin.save();

    await sendEmail(
      email,
      'Verify Your Email',
      `Your new OTP is ${otp}. Please verify your email to continue.`
    );

    console.log(`New OTP sent to admin ${email}`);
    res.status(200).json({ message: 'New OTP sent successfully' });
  } catch (error) {
    console.log(`Error in resendOTP: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json(admin);
  } catch (error) {
    console.log(`Error in getAdminProfile: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createAdmin,
  validateAgent,
  viewAllAgents,
  getAgentDetails,
  banOrDeleteAgent,
  sendEmailToAgents,
  getPendingAgents,
  getAllUsers,
  deactivateUser,
  deleteApartment,
  getAllReports,
  resolveReport,
  updateAdminProfile,
  approveApartment,
  declineApartment,
  verifyOTP,
  resendOTP,
  getAdminProfile
};
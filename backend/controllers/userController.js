const User = require('../models/User');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const Apartment = require('../models/Apartment');
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register a user
const registerUser = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    // Check User collection
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`User with email ${email} already exists`);
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Check Agent collection
    const agentExists = await Agent.findOne({ email });
    if (agentExists) {
      console.log(`Agent with email ${email} already exists`);
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = await User.create({ fullName, email, password: hashedPassword, otp });

    await sendEmail(
      email,
      'Verify Your Email',
      `Your OTP is ${otp}. Please verify your email to log in.`
    );

    console.log(`User registered: ${user.email}, OTP sent`);
    res.status(201).json({ message: 'User registered, please verify your email with the OTP sent' });
  } catch (error) {
    console.log(`Error in registerUser: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login (for all roles)
const login = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user;
    switch (role) {
      case 'admin':
        user = await Admin.findOne({ email });
        break;
      case 'agent':
        user = await Agent.findOne({ email });
        break;
      case 'user':
        user = await User.findOne({ email });
        break;
      default:
        console.log('Invalid role provided');
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!user) {
      console.log(`No ${role} found with email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Incorrect password for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check email verification
    if (!user.verified) {
      console.log(`Email not verified for ${email}`);
      return res.status(403).json({ message: 'Please verify your email with the OTP' });
    }

    // For agents, ensure they're approved
    if (role === 'agent' && user.status !== 'approved') {
      console.log(`Agent ${email} is not approved`);
      
      // Send reminder email to admin
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      await sendEmail(
        adminEmail,
        'Agent Approval Reminder',
        `Agent ${user.fullName} (${email}) is waiting for approval. They just attempted to log in. Please review their application.`
      );
      
      return res.status(403).json({ message: 'Account not approved yet' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    console.log(`${role} logged in: ${email}`);
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.log(`Error in login: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp, role } = req.body;

  try {
    let user;
    switch (role) {
      case 'admin':
        user = await Admin.findOne({ email });
        break;
      case 'agent':
        user = await Agent.findOne({ email });
        break;
      case 'user':
        user = await User.findOne({ email });
        break;
      default:
        console.log('Invalid role provided');
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!user) {
      console.log(`No ${role} found with email ${email}`);
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      console.log(`Invalid OTP for ${email}`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.verified = true;
    user.otp = null; // Clear OTP after verification
    await user.save();

    console.log(`Email verified for ${email}`);
    res.status(200).json({ message: 'Email verified, you can now log in' });
  } catch (error) {
    console.log(`Error in verifyOTP: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  const { email, role } = req.body;

  try {
    let user;
    switch (role) {
      case 'admin':
        user = await Admin.findOne({ email });
        break;
      case 'agent':
        user = await Agent.findOne({ email });
        break;
      case 'user':
        user = await User.findOne({ email });
        break;
      default:
        console.log('Invalid role provided');
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!user) {
      console.log(`No ${role} found with email ${email}`);
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.verified) {
      console.log(`${role} ${email} is already verified`);
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    await user.save();

    await sendEmail(
      email,
      'Verify Your Email',
      `Your new OTP is ${otp}. Please verify your email to log in.`
    );

    console.log(`New OTP sent to ${email}`);
    res.status(200).json({ message: 'New OTP sent successfully' });
  } catch (error) {
    console.log(`Error in resendOTP: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// View all apartments
const viewApartments = async (req, res) => {
  try {
    const apartments = await Apartment.find();
    console.log(`Fetched ${apartments.length} apartments`);
    res.status(200).json(apartments);
  } catch (error) {
    console.log(`Error in viewApartments: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Book an inspection
const bookInspection = async (req, res) => {
  const { apartmentId } = req.body;
  const userId = req.user.id;

  try {
    const apartment = await Apartment.findById(apartmentId).populate('agentId');
    if (!apartment) {
      console.log(`Apartment ${apartmentId} not found`);
      return res.status(404).json({ message: 'Apartment not found' });
    }
    if (apartment.availability === 'Unavailable') {
      console.log(`Apartment ${apartmentId} is unavailable`);
      return res.status(400).json({ message: 'Apartment is unavailable' });
    }

    await sendEmail(
      apartment.agentId.email,
      'Inspection Request',
      `User ${req.user.email} has requested an inspection for your apartment at ${apartment.location}.`
    );

    console.log(`Inspection booked for apartment ${apartmentId} by user ${userId}`);
    res.status(200).json({ message: 'Inspection booked, agent notified' });
  } catch (error) {
    console.log(`Error in bookInspection: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Make payment
const makePayment = async (req, res) => {
  const { apartmentId, amount } = req.body;
  const userId = req.user.id;

  try {
    const apartment = await Apartment.findById(apartmentId).populate('agentId');
    if (!apartment) {
      console.log(`Apartment ${apartmentId} not found`);
      return res.status(404).json({ message: 'Apartment not found' });
    }
    if (apartment.availability === 'Unavailable') {
      console.log(`Apartment ${apartmentId} is unavailable`);
      return res.status(400).json({ message: 'Apartment is unavailable' });
    }

    apartment.availability = 'Unavailable';
    apartment.rentedBy = userId; // Set the user who rented it
    await apartment.save();

    await sendEmail(
      apartment.agentId.email,
      'Payment Received',
      `User ${req.user.email} has paid ₦${amount} for your apartment at ${apartment.location}.`
    );

    console.log(`Payment made for apartment ${apartmentId} by user ${userId}`);
    res.status(200).json({ message: 'Payment successful, apartment reserved' });
  } catch (error) {
    console.log(`Error in makePayment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Report an apartment
const reportApartment = async (req, res) => {
  const { propertyId, propertyTitle, propertyLocation, userName, userEmail, reason, details } = req.body;
  const userId = req.user.id;

  try {
    const apartment = await Apartment.findById(propertyId);
    if (!apartment) {
      console.log(`Apartment ${propertyId} not found`);
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const report = await Report.create({
      propertyId,
      propertyTitle,
      propertyLocation,
      userId,
      userName,
      userEmail,
      reason,
      details,
      status: 'pending'
    });

    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@example.com',
      'New Report Submitted',
      `User ${userEmail} (${userName}) reported an issue:\nReason: ${reason}\nDetails: ${details}\nProperty: ${propertyTitle} at ${propertyLocation}`
    );

    console.log(`Report submitted for property ${propertyId} by user ${userId}`);
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    console.log(`Error in reportApartment: ${error.message}`);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get apartment by ID
const getApartmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const apartment = await Apartment.findById(id)
      .populate('agentId', 'fullName email')
      .populate('rentedBy', 'email');
    if (!apartment) {
      console.log(`Apartment with ID ${id} not found`);
      return res.status(404).json({ message: 'Apartment not found' });
    }
    console.log(`Apartment ${id} fetched`);
    res.status(200).json(apartment);
  } catch (error) {
    console.log(`Error in getApartmentById: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile (new)
const updateUserProfile = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log(`Incorrect current password for user ${user.email}`);
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`Password updated for user ${user.email}`);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.log(`Error in updateUserProfile: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user account (new)
const deleteUserAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete related data (e.g., reports)
    await Report.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    console.log(`User ${user.email} account deleted`);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.log(`Error in deleteUserAccount: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Contact agent (new)
const contactAgent = async (req, res) => {
  const { apartmentId, message } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    const apartment = await Apartment.findById(apartmentId).populate('agentId');
    if (!apartment) {
      console.log(`Apartment ${apartmentId} not found`);
      return res.status(404).json({ message: 'Apartment not found' });
    }

    await sendEmail(
      apartment.agentId.email,
      'Message from User',
      `User ${user.email} sent you a message regarding your apartment at ${apartment.location}: ${message}`
    );

    console.log(`Message sent to agent for apartment ${apartmentId} by user ${userId}`);
    res.status(200).json({ message: 'Message sent to agent successfully' });
  } catch (error) {
    console.log(`Error in contactAgent: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser: login,
  getUserProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateUserProfile,
  verifyOTP,
  resendOTP,
  viewApartments,
  bookInspection,
  makePayment,
  reportApartment,
  getApartmentById,
  deleteUserAccount,
  contactAgent,
  getUserBookings: async (req, res) => {
    try {
      const bookings = await Apartment.find({ rentedBy: req.user.id })
        .populate('agentId', 'fullName email phone');
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
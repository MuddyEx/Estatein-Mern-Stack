const Agent = require('../models/Agent');
const User = require('../models/User');
const Apartment = require('../models/Apartment');
const cloudinary = require('../config/cloudinary');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Payment = require('../models/Payment');

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const agent = await Agent.findOne({ email });
    if (!agent) {
      console.log(`No agent found with email ${email}`);
      return res.status(400).json({ message: 'Agent not found' });
    }

    if (agent.otp !== otp) {
      console.log(`Invalid OTP for ${email}`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    agent.verified = true;
    agent.otp = null; // Clear OTP after verification
    await agent.save();

    console.log(`Email verified for agent ${email}`);
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
    const agent = await Agent.findOne({ email });
    if (!agent) {
      console.log(`No agent found with email ${email}`);
      return res.status(400).json({ message: 'Agent not found' });
    }

    if (agent.verified) {
      console.log(`Agent ${email} is already verified`);
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const otp = generateOTP();
    agent.otp = otp;
    await agent.save();

    await sendEmail(
      email,
      'Verify Your Email',
      `Your new OTP is ${otp}. Please verify your email to continue.`
    );

    console.log(`New OTP sent to agent ${email}`);
    res.status(200).json({ message: 'New OTP sent successfully' });
  } catch (error) {
    console.log(`Error in resendOTP: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new agent
const registerAgent = async (req, res) => {
  const { fullName, username, email, phone, address, password, passportPhoto, certificate } = req.body;

  try {
    // Check Agent collection for email
    const agentExists = await Agent.findOne({ email });
    if (agentExists) {
      console.log(`Agent with email ${email} already exists`);
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Check User collection for email
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`User with email ${email} already exists`);
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Check Agent collection for username
    const usernameExists = await Agent.findOne({ username });
    if (usernameExists) {
      console.log(`Username ${username} is already taken`);
      return res.status(400).json({ message: 'Username already taken' });
    }

    let passportUrl = '';
    let certificateUrl = '';

    if (passportPhoto) {
      const passportResult = await cloudinary.uploader.upload(passportPhoto, {
        resource_type: 'image',
        width: 500,
        height: 500,
        crop: 'limit',
      });
      passportUrl = passportResult.secure_url;
      console.log(`Passport photo uploaded: ${passportUrl}`);
    }

    if (certificate) {
      const certResult = await cloudinary.uploader.upload(certificate, {
        resource_type: 'image',
        width: 500,
        height: 500,
        crop: 'limit',
      });
      certificateUrl = certResult.secure_url;
      console.log(`Certificate uploaded: ${certificateUrl}`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const agent = await Agent.create({
      fullName,
      username,
      email,
      phone,
      address,
      passportPhoto: passportUrl,
      certificate: certificateUrl,
      password: hashedPassword,
      otp,
    });

    // Notify agent
    await sendEmail(
      email,
      'Verify Your Email',
      `Your OTP is ${otp}. Please verify your email. After verification, wait for admin approval to access your account.`
    );

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await sendEmail(
      adminEmail,
      'New Agent Registration',
      `A new agent (${fullName}, ${email}) has registered and is awaiting your approval.`
    );

    console.log(`Agent registered: ${agent.email}, OTP sent`);
    res.status(201).json({ message: 'Agent registered. Please verify your email and wait for admin approval.' });
  } catch (error) {
    console.log(`Error in registerAgent: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Post a new apartment
const postApartment = async (req, res) => {
  const { 
    title, location, images, video, pricePerDay, address, state, totalRooms, parkingSpace, 
    propertyType, facilities, partiesAllowed, description 
  } = req.body;
  const agentId = req.user.id;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      console.log(`Agent ${agentId} not found`);
      return res.status(404).json({ message: 'Agent not found' });
    }
    if (agent.status !== 'approved') {
      console.log(`Agent ${agentId} not approved`);
      return res.status(403).json({ message: 'Only approved agents can post apartments. Please wait for admin approval.' });
    }

    const imageArray = Array.isArray(images) ? images : images ? [images] : [];
    if (imageArray.length < 1 || imageArray.length > 5) {
      return res.status(400).json({ message: 'You must upload between 1 and 5 images' });
    }

    const imageUrls = [];
    for (const image of imageArray) {
      const result = await cloudinary.uploader.upload(image, {
        resource_type: 'image',
        width: 800,
        height: 600,
        crop: 'limit',
      });
      imageUrls.push(result.secure_url);
      console.log(`Image uploaded: ${result.secure_url}`);
    }

    let videoUrl = '';
    if (video) {
      const videoResult = await cloudinary.uploader.upload(video, {
        resource_type: 'video',
        width: 1280,
        height: 720,
        crop: 'limit',
      });
      videoUrl = videoResult.secure_url;
      console.log(`Video uploaded: ${videoUrl}`);
    }

    const apartment = await Apartment.create({
      title,
      agentId,
      location,
      images: imageUrls,
      video: videoUrl,
      pricePerDay,
      address,
      state,
      totalRooms,
      parkingSpace,
      propertyType,
      facilities,
      partiesAllowed,
      description,
      status: 'pending'
    });

    console.log(`Apartment posted by agent ${agent.email} and pending approval`);
    res.status(201).json({ message: 'Apartment posted successfully and pending approval', apartment });
  } catch (error) {
    console.log(`Error in postApartment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit an apartment
const editApartment = async (req, res) => {
  const { 
    title, location, images, video, pricePerDay, address, state, totalRooms, 
    parkingSpace, propertyType, facilities, partiesAllowed, description, availability,
    rentedBy
  } = req.body;
  const agentId = req.user.id;
  const apartmentId = req.params.id;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent || agent.status !== 'approved') {
      console.log(`Agent ${agentId} not found or not approved`);
      return res.status(403).json({ message: 'Only approved agents can edit apartments' });
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      console.log(`Apartment ${apartmentId} not found`);
      return res.status(404).json({ message: 'Apartment not found' });
    }
    if (apartment.agentId.toString() !== agentId) {
      console.log(`Agent ${agentId} not authorized to edit this apartment`);
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (images && images.length > 0) {
      const imageUrls = [];
      for (const image of images) {
        if (image.startsWith('http')) {
          imageUrls.push(image); // Keep existing image URLs
        } else {
          const result = await cloudinary.uploader.upload(image, {
            resource_type: 'image',
            width: 800,
            height: 600,
            crop: 'limit',
          });
          imageUrls.push(result.secure_url);
          console.log(`Image uploaded: ${result.secure_url}`);
        }
      }
      apartment.images = imageUrls;
    }

    if (video) {
      if (!video.startsWith('http')) {
        const videoResult = await cloudinary.uploader.upload(video, {
          resource_type: 'video',
          width: 1280,
          height: 720,
          crop: 'limit',
        });
        apartment.video = videoResult.secure_url;
        console.log(`Video uploaded: ${videoResult.secure_url}`);
      } else {
        apartment.video = video; // Keep existing video URL
      }
    }

    // Update all fields
    apartment.title = title || apartment.title;
    apartment.location = location || apartment.location;
    apartment.pricePerDay = pricePerDay || apartment.pricePerDay;
    apartment.address = address || apartment.address;
    apartment.state = state || apartment.state;
    apartment.totalRooms = totalRooms || apartment.totalRooms;
    apartment.parkingSpace = parkingSpace !== undefined ? parkingSpace : apartment.parkingSpace;
    apartment.propertyType = propertyType || apartment.propertyType;
    apartment.facilities = facilities || apartment.facilities;
    apartment.partiesAllowed = partiesAllowed !== undefined ? partiesAllowed : apartment.partiesAllowed;
    apartment.description = description || apartment.description;
    apartment.availability = availability || apartment.availability;
    
    // Handle rentedBy field - explicitly set to null if provided
    if (rentedBy !== undefined) {
      apartment.rentedBy = rentedBy;
      console.log(`Updating rentedBy to: ${rentedBy}`);
    }

    await apartment.save();
    console.log(`Apartment ${apartmentId} updated by agent ${agentId}. New rentedBy: ${apartment.rentedBy}`);
    res.status(200).json({ message: 'Apartment updated', apartment });
  } catch (error) {
    console.log(`Error in editApartment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an apartment
const deleteApartment = async (req, res) => {
  const { id } = req.params;  // Changed from apartmentId to id to match route param
  const agentId = req.user.id;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent || agent.status !== 'approved') {
      console.log(`Agent ${agentId} not found or not approved`);
      return res.status(403).json({ message: 'Only approved agents can delete apartments' });
    }

    const apartment = await Apartment.findById(id);  // Changed from apartmentId to id
    if (!apartment) {
      console.log(`Apartment ${id} not found`);  // Changed from apartmentId to id
      return res.status(404).json({ message: 'Apartment not found' });
    }

    if (apartment.agentId.toString() !== agentId) {
      console.log(`Agent ${agentId} not authorized to delete apartment ${id}`);  // Changed from apartmentId to id
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Apartment.findByIdAndDelete(id);  // Changed from apartmentId to id
    console.log(`Apartment ${id} deleted by agent ${agentId}`);  // Changed from apartmentId to id
    res.status(200).json({ message: 'Apartment deleted successfully' });
  } catch (error) {
    console.log(`Error in deleteApartment: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update agent profile (picture, password)
const updateAgentProfile = async (req, res) => {
  const { passportPhoto, currentPassword, newPassword } = req.body;
  const agentId = req.user.id;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      console.log(`Agent ${agentId} not found`);
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (passportPhoto) {
      const result = await cloudinary.uploader.upload(passportPhoto, {
        resource_type: 'image',
        width: 500,
        height: 500,
        crop: 'limit',
      });
      agent.passportPhoto = result.secure_url;
      console.log(`Profile picture updated: ${result.secure_url}`);
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, agent.password);
      if (!isMatch) {
        console.log(`Incorrect current password for agent ${agent.email}`);
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      agent.password = await bcrypt.hash(newPassword, 10);
      console.log(`Password updated for agent ${agent.email}`);
    }

    await agent.save();
    
    // Return the updated agent data without password
    const agentData = agent.toObject();
    delete agentData.password;
    
    res.status(200).json({ 
      message: 'Profile updated successfully',
      agent: agentData
    });
  } catch (error) {
    console.log(`Error in updateAgentProfile: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete agent account
const deleteAgentAccount = async (req, res) => {
  const agentId = req.user.id;

  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      console.log(`Agent ${agentId} not found`);
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Delete agent's apartments
    await Apartment.deleteMany({ agentId });
    await Agent.findByIdAndDelete(agentId);
    console.log(`Agent ${agent.email} account and associated apartments deleted`);
    res.status(200).json({ message: 'Account and associated apartments deleted successfully' });
  } catch (error) {
    console.log(`Error in deleteAgentAccount: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Existing getApartments for list
const getApartments = async (req, res) => {
  console.log('Received query parameters:', req.query);
  const { location, propertyType, minPrice, maxPrice, availability, featured, limit } = req.query;

  try {
    let filter = {};
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (propertyType) filter.propertyType = propertyType;
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = Number(maxPrice);
    }
    if (availability) filter.availability = availability;
    if (featured) filter.featured = featured === 'true';

    const apartments = await Apartment.find(filter)
      .limit(limit ? Number(limit) : 0)
      .populate('agentId', 'fullName email')
      .populate('rentedBy', 'email');

    console.log('Filtered apartments:', apartments);
    res.status(200).json(apartments);
  } catch (error) {
    console.error('Error fetching apartments:', error.message);
    res.status(500).json({ message: 'Server error while fetching apartments', error: error.message });
  }
};

// New endpoint for single property
const getApartmentById = async (req, res) => {
  const { id } = req.params;
  console.log('Received ID:', id);
  try {
    const apartment = await Apartment.findById(id)
      .populate('agentId', 'fullName email');
    if (!apartment) {
      console.log('Apartment not found for ID:', id);
      return res.status(404).json({ message: 'Apartment not found' });
    }
    res.status(200).json(apartment);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Agent login
const loginAgent = async (req, res) => {
  const { email, password } = req.body;

  try {
    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if agent is banned
    if (agent.status === 'banned') {
      return res.status(403).json({
        message: 'Your account has been banned. Please contact support for assistance.',
        reason: agent.statusReason || 'No reason provided'
      });
    }

    // Check if agent is approved
    if (agent.status !== 'approved') {
      return res.status(403).json({
        message: 'Your account is pending approval. Please wait for admin verification.'
      });
    }

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: agent._id, role: 'agent' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const agentData = agent.toObject();
    delete agentData.password;

    res.status(200).json({
      message: 'Login successful',
      token,
      agent: agentData
    });
  } catch (error) {
    console.log(`Error in loginAgent: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get apartments posted by the agent
const getAgentApartments = async (req, res) => {
  const agentId = req.user.id;

  try {
    const apartments = await Apartment.find({ agentId })
      .populate('rentedBy', 'fullName email'); // Populate user data with fullName and email
    
    if (!apartments || apartments.length === 0) {
      console.log(`No apartments found for agent ${agentId}`);
      return res.status(404).json({ message: 'No apartments found' });
    }
    console.log(`Fetched apartments for agent ${agentId}`);
    res.status(200).json(apartments);
  } catch (error) {
    console.log(`Error in getAgentApartments: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get agent transactions
const getAgentTransactions = async (req, res) => {
  const agentId = req.user.id;

  try {
    // Find all apartments owned by this agent
    const agentApartments = await Apartment.find({ agentId });
    const apartmentIds = agentApartments.map(apt => apt._id);

    // Find all payments for these apartments that are agent payments
    const transactions = await Payment.find({ 
      apartmentId: { $in: apartmentIds },
      type: 'booking',
      status: 'completed',
      'metadata.isAgentPayment': true
    })
    .populate('userId', 'email')
    .populate('apartmentId', 'title location')
    .sort({ createdAt: -1 });

    // Calculate total available and pending amounts
    const totalAvailable = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.agentAmount, 0);

    const totalPending = transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.agentAmount, 0);

    console.log(`Fetched ${transactions.length} transactions for agent ${agentId}`);
    res.status(200).json({ 
      transactions,
      summary: {
        totalAvailable,
        totalPending
      }
    });
  } catch (error) {
    console.log(`Error in getAgentTransactions: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerAgent,
  loginAgent,
  getAgentProfile: async (req, res) => {
    try {
      const agent = await Agent.findById(req.user.id).select('-password');
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateAgentProfile,
  postApartment,
  getAgentApartments,
  updateApartment: editApartment,
  deleteApartment,
  deleteAgentAccount,
  getApartments,
  getApartmentById,
  verifyOTP,
  resendOTP,
  getAgentTransactions
};
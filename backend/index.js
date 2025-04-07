const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Import models
const Admin = require('./models/Admin.js');
const Agent = require('./models/Agent.js');
const User = require('./models/User.js');
const Apartment = require('./models/Apartment.js');
const Report = require('./models/Report.js');

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors({ 
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true 
}));
app.use(express.urlencoded({ extended: true }));

// Import routes
const adminRoutes = require('./routes/adminRoutes.js');
const agentRoutes = require('./routes/agentRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const bankRoutes = require('./routes/bankRoutes.js');
const contactRoutes = require('./routes/contact.js');

const connectDB = require('./config/db.js');

// Admin creation endpoint
app.post('/api/admin/create-admin', async (req, res) => {
  const { email, password, secretKey } = req.body;
  const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'supersecret123';

  if (secretKey !== ADMIN_SECRET_KEY) {
    return res.status(401).json({ message: 'Invalid secret key' });
  }

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      email,
      password: hashedPassword,
      role: 'admin',
      verified: true,
    });
    await admin.save();

    console.log('Admin created:', admin.email);
    res.status(201).json({ message: `Admin created successfully. Use email: ${email} and your password to log in.` });
  } catch (error) {
    console.error('Error creating admin:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// New admin endpoints
// Get all users
app.get('/api/admin/secret-admin-route/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate user
app.put('/api/admin/secret-admin-route/deactivate-user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = false; // Assumes 'active' field exists in User schema
    await user.save();
    res.json({ message: 'User deactivated' });
  } catch (error) {
    console.error('Error deactivating user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete apartment (admin override)
app.delete('/api/admin/secret-admin-route/delete-apartment/:id', async (req, res) => {
  try {
    const apartment = await Apartment.findByIdAndDelete(req.params.id);
    if (!apartment) return res.status(404).json({ message: 'Apartment not found' });
    res.json({ message: 'Apartment deleted' });
  } catch (error) {
    console.error('Error deleting apartment:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all reports
app.get('/api/admin/secret-admin-route/reports', async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('userId', 'email') // Populate user email
      .populate('apartmentId', 'location'); // Populate apartment location
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve report
app.put('/api/admin/secret-admin-route/resolve-report/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.status = 'resolved';
    await report.save();
    res.json({ message: 'Report resolved' });
  } catch (error) {
    console.error('Error resolving report:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Connect to MongoDB
connectDB();

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/contact', contactRoutes);

// Add a debug route to check if bank routes are mounted
app.get('/api/debug/routes', (req, res) => {
  console.log('Registered routes:', app._router.stack
    .filter(r => r.route)
    .map(r => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }))
  );
  res.json({ message: 'Check server console for routes' });
});

// Test route
app.get('/', (req, res) => {
  console.log('Server is running!');
  res.send('Real Estate Agency System Backend');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const jwt = require('jsonwebtoken');

// Protect middleware - verifies JWT token
const protect = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(`Invalid token: ${error.message}`);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin middleware - checks if user is admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log(`User role ${req.user?.role} not authorized`);
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

module.exports = { protect, admin };
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get agent from the token
      req.agent = await Agent.findById(decoded.id).select('-password');

      if (!req.agent) {
        return res.status(401).json({ message: 'Not authorized, agent not found' });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect }; 
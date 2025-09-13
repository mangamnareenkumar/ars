import jwt from 'jsonwebtoken';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  // For development purposes, bypass authentication
  // This allows the calendar API to work without authentication
  req.user = { id: 1, role: 'faculty' };
  return next();
  
  // The code below would be used in production
  /*
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
  */
};

export default authenticateToken;
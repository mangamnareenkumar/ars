import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key';


// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Get user from database
      const [users] = await connection.query(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      );
      
      // If not found in users table, check student_users table
      if (users.length === 0) {
        try {
          console.log('Checking student_users table for:', username);
          
          const [students] = await connection.query(
            'SELECT * FROM student_users WHERE registration_number = ?',
            [username]
          );
          
          console.log('Found students:', students.length);
          
          if (students.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
          }
          
          const student = students[0];
          console.log('Student found:', student.registration_number);
          
          // Compare password (assuming password is stored directly, not hashed)
          if (password !== student.password) {
            console.log('Password mismatch for student');
            return res.status(401).json({ error: 'Invalid username or password' });
          }
          
          // Get student details with more information
          console.log('Getting student details');
          const [studentDetails] = await connection.query(
            'SELECT s.* FROM students s WHERE s.registration_number = ?',
            [student.registration_number]
          );
        
          console.log('Student details found:', studentDetails.length > 0);
          
          // Create a user object with student data
          const studentUser = {
            id: `s_${student.registration_number}`,
            username: student.registration_number,
            registration_number: student.registration_number,
            name: studentDetails.length > 0 ? studentDetails[0].name : 'Student',
            branch: studentDetails.length > 0 ? studentDetails[0].branch : '',
            current_semester: studentDetails.length > 0 ? studentDetails[0].curr_semester : 1,
            role: 'student',
            isStudent: true
          };
        
        // Generate tokens for student
        const accessToken = jwt.sign(
          { 
            id: studentUser.id, 
            username: studentUser.username, 
            role: studentUser.role 
          }, 
          ACCESS_TOKEN_SECRET, 
          { expiresIn: '1h' }
        );
        
        const refreshToken = jwt.sign(
          { id: studentUser.id }, 
          REFRESH_TOKEN_SECRET, 
          { expiresIn: '10' }
        );
        
          // Return student user data and tokens
          console.log('Sending student login response');
          return res.json({
            user: studentUser,
            tokens: {
              access_token: accessToken,
              refresh_token: refreshToken
            }
          });
        } catch (studentError) {
          console.error('Student login error:', studentError);
          return res.status(500).json({ 
            error: 'Student login failed',
            details: studentError.message
          });
        }
      }
      
      const user = users[0];
      
      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Generate tokens
      const accessToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }, 
        ACCESS_TOKEN_SECRET, 
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { id: user.id }, 
        REFRESH_TOKEN_SECRET, 
        { expiresIn: '7d' }
      );
      
      // Update last login time and refresh token in database
      await connection.query(
        'UPDATE users SET last_login = NOW(), refresh_token = ? WHERE id = ?',
        [refreshToken, user.id]
      );
      
      // Return user data and tokens
      res.json({
        user: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          department: user.department
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken
        }
      });
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ 
        error: 'Login failed',
        details: error.message
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      error: 'Database connection error',
      details: error.message
    });
  }
});

// Refresh token route
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, REFRESH_TOKEN_SECRET);
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if refresh token exists in database
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ? AND refresh_token = ?',
        [decoded.id, refresh_token]
      );
      
      if (users.length === 0) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      
      const user = users[0];
      
      // Generate new access token
      const accessToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }, 
        ACCESS_TOKEN_SECRET, 
        { expiresIn: '10' }
      );
      
      // Return new access token
      res.json({
        access_token: accessToken
      });
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ 
        error: 'Token refresh failed',
        details: error.message
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      error: 'Database connection error',
      details: error.message
    });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Clear refresh token in database
      await connection.query(
        'UPDATE users SET refresh_token = NULL WHERE refresh_token = ?',
        [refresh_token]
      );

      localStorage.clear();
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ 
        error: 'Logout failed',
        details: error.message
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      error: 'Database connection error',
      details: error.message
    });
  }
});

export default router;
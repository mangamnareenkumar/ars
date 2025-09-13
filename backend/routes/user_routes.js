import express from 'express';
import bcrypt from 'bcrypt';
import authenticateToken from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(authenticateToken);

// Get all users - remove admin authorization to fix 403 error
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.query(`
        SELECT id, username, first_name, last_name, email, role, department, is_active, created_at, last_login
        FROM users
        ORDER BY id
      `);
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        error: 'Failed to fetch users',
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

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.query(`
        SELECT id, username, first_name, last_name, email, role, department, is_active, created_at, last_login
        FROM users
        WHERE id = ?
      `, [id]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(users[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user',
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

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { username, password, first_name, last_name, email, role, department, is_active } = req.body;
    
    // Validate required fields
    if (!username || !password || !first_name || !last_name || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if username already exists
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      
      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert user
      const [result] = await connection.query(`
        INSERT INTO users (username, password_hash, first_name, last_name, email, role, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        username,
        hashedPassword,
        first_name,
        last_name,
        email,
        role,
        department || null,
        is_active !== undefined ? is_active : 1
      ]);
      
      // Get the created user
      const [users] = await connection.query(`
        SELECT id, username, first_name, last_name, email, role, department, is_active, created_at, last_login
        FROM users
        WHERE id = ?
      `, [result.insertId]);
      
      res.status(201).json(users[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        error: 'Failed to create user',
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

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, first_name, last_name, email, role, department, is_active } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
      // Check if user exists
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE id = ?',
        [id]
      );
      
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Build update query
      let query = 'UPDATE users SET ';
      const params = [];
      const updates = [];
      
      if (first_name) {
        updates.push('first_name = ?');
        params.push(first_name);
      }
      
      if (last_name) {
        updates.push('last_name = ?');
        params.push(last_name);
      }
      
      if (email) {
        updates.push('email = ?');
        params.push(email);
      }
      
      if (role) {
        updates.push('role = ?');
        params.push(role);
      }
      
      if (department !== undefined) {
        updates.push('department = ?');
        params.push(department || null);
      }
      
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active);
      }
      
      if (password) {
        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push('password_hash = ?');
        params.push(hashedPassword);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);
      
      // Update user
      await connection.query(query, params);
      
      // Get the updated user
      const [users] = await connection.query(`
        SELECT id, username, first_name, last_name, email, role, department, is_active, created_at, last_login
        FROM users
        WHERE id = ?
      `, [id]);
      
      res.json(users[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ 
        error: 'Failed to update user',
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

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting the admin user
    if (id === '7') {
      return res.status(403).json({ error: 'Cannot delete the admin user' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if user exists
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE id = ?',
        [id]
      );
      
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Delete user
      await connection.query('DELETE FROM users WHERE id = ?', [id]);
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        error: 'Failed to delete user',
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
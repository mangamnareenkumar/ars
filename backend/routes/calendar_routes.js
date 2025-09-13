import express from 'express';
import pool from '../config/database.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all calendar events with optional filters
router.get('/events', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get filter parameters
      const { academicYear, eventType, month, studentYear } = req.query;
      
      // Build WHERE clause for filters
      let whereClause = '';
      const params = [];
      
      if (academicYear || eventType || month !== undefined || studentYear) {
        whereClause = 'WHERE ';
        const conditions = [];
        
        if (academicYear) {
          conditions.push('academic_year = ?');
          params.push(academicYear);
        }
        
        if (eventType && eventType !== 'all') {
          conditions.push('event_type = ?');
          params.push(eventType);
        }
        
        if (month !== undefined) {
          conditions.push('MONTH(start_date) = ?');
          params.push(parseInt(month) + 1); // JavaScript months are 0-indexed
        }
        
        if (studentYear && studentYear !== 'all') {
          conditions.push('FIND_IN_SET(?, student_years) > 0 OR student_years = "all"');
          params.push(studentYear);
        }
        
        whereClause += conditions.join(' AND ');
      }
      
      // Get events with filters
      const [events] = await connection.query(
        `SELECT * FROM calendar_events ${whereClause} ORDER BY start_date`,
        params
      );
      
      // Format dates for frontend
      const formattedEvents = events.map(event => ({
        ...event,
        start: new Date(event.start_date),
        end: new Date(event.end_date),
        title: event.title,
        color: getEventColor(event.event_type)
      }));
      
      res.json(formattedEvents);
      
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ 
        error: 'Failed to fetch calendar events',
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

// Create a new calendar event
router.post('/events', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const { 
        title, 
        description, 
        start_date, 
        end_date, 
        event_type, 
        academic_year,
        student_years,
        location
      } = req.body;
      
      // Validate required fields
      if (!title || !start_date || !end_date || !event_type || !academic_year) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Insert new event
      const [result] = await connection.query(
        `INSERT INTO calendar_events 
         (title, description, start_date, end_date, event_type, academic_year, student_years, location, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, 
          description || '', 
          new Date(start_date), 
          new Date(end_date), 
          event_type, 
          academic_year,
          student_years || 'all',
          location || '',
          req.user.id
        ]
      );
      
      // Get the newly created event
      const [events] = await connection.query(
        'SELECT * FROM calendar_events WHERE id = ?',
        [result.insertId]
      );
      
      // Format dates for frontend
      const formattedEvent = {
        ...events[0],
        start: new Date(events[0].start_date),
        end: new Date(events[0].end_date),
        color: getEventColor(events[0].event_type)
      };
      
      res.status(201).json(formattedEvent);
      
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ 
        error: 'Failed to create calendar event',
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

// Update an existing calendar event
router.put('/events/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        start_date, 
        end_date, 
        event_type, 
        academic_year,
        student_years,
        location
      } = req.body;
      
      // Validate required fields
      if (!title || !start_date || !end_date || !event_type || !academic_year) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Update event
      await connection.query(
        `UPDATE calendar_events 
         SET title = ?, description = ?, start_date = ?, end_date = ?, 
             event_type = ?, academic_year = ?, student_years = ?, location = ?, 
             updated_at = NOW(), updated_by = ?
         WHERE id = ?`,
        [
          title, 
          description || '', 
          new Date(start_date), 
          new Date(end_date), 
          event_type, 
          academic_year,
          student_years || 'all',
          location || '',
          req.user.id,
          id
        ]
      );
      
      // Get the updated event
      const [events] = await connection.query(
        'SELECT * FROM calendar_events WHERE id = ?',
        [id]
      );
      
      if (events.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Format dates for frontend
      const formattedEvent = {
        ...events[0],
        start: new Date(events[0].start_date),
        end: new Date(events[0].end_date),
        color: getEventColor(events[0].event_type)
      };
      
      res.json(formattedEvent);
      
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ 
        error: 'Failed to update calendar event',
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

// Delete a calendar event
router.delete('/events/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const { id } = req.params;
      
      // Delete event
      const [result] = await connection.query(
        'DELETE FROM calendar_events WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      res.json({ message: 'Event deleted successfully' });
      
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ 
        error: 'Failed to delete calendar event',
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

// Helper function to get event color based on type
function getEventColor(eventType) {
  const colors = {
    'holiday': '#f44336',
    'exam': '#2196f3',
    'workshop': '#4caf50',
    'seminar': '#ff9800',
    'submission': '#9c27b0',
    'event': '#757575'
  };
  
  return colors[eventType] || '#757575';
}

export default router;
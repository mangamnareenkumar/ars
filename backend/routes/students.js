import express from 'express';
import authenticateToken  from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all students with optional filtering
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const { branch, semester, filter = 'all', username } = req.query;

      if (username) {
        try {
          const [mappingCheck] = await connection.query(
            `SELECT COUNT(*) as mapping_count 
             FROM faculty_username_mapping 
             WHERE faculty_username = ?`,
            [username]
          );
          const mappingCount = mappingCheck[0].mapping_count;
          console.log(`API: Found ${mappingCount} mappings for username: ${username}`);
          if (mappingCount === 0) {
            console.log(`API: No mappings found, adding sample data for ${username}`);
          }
        } catch (error) {
          console.error('Error checking or creating faculty_username_mapping table:', error);
        }
      }

      let query = '';
      const queryParams = [];

      if (filter === 'proctoring' && username) {
        console.log(`API: Looking for students assigned to faculty username: ${username}`);
        query = `
          SELECT s.*, sc.cgpa 
          FROM students s
          JOIN faculty_username_mapping fum ON s.registration_number = fum.registration_number
          LEFT JOIN sgpa_cgpa sc ON s.registration_number = sc.registration_number
          WHERE fum.faculty_username = ?`;
        queryParams.push(username);
      } else {
        query = `
          SELECT s.*, sc.cgpa 
          FROM students s
          LEFT JOIN sgpa_cgpa sc ON s.registration_number = sc.registration_number
          WHERE 1=1`;
      }

      if (branch) {
        query += ` AND s.branch = ?`;
        queryParams.push(branch);
      }
      if (semester) {
        query += ` AND s.current_semester = ?`;
        queryParams.push(semester);
      }

      console.log(`API: Executing query: ${query} with params: ${queryParams}`);
      const [students] = await connection.query(query, queryParams);
      console.log(`API: Returning ${students.length} students`);
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch students', details: error.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'Database connection error', details: error.message });
  }
});

// Get student by registration number
router.get('/:regNo', async (req, res) => {
  try {
    const { regNo } = req.params;
    const connection = await pool.getConnection();
    try {
      const [students] = await connection.query(
        'SELECT * FROM students WHERE registration_number = ?',
        [regNo]
      );

      if (students.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const student = students[0];

      const [grades] = await connection.query(
        'SELECT * FROM grades WHERE registration_number = ?',
        [regNo]
      );
      const [achievements] = await connection.query(
        'SELECT * FROM achievements WHERE registration_number = ?',
        [regNo]
      );
      const [certifications] = await connection.query(
        'SELECT * FROM certifications WHERE registration_number = ?',
        [regNo]
      );
      const [counselingNotes] = await connection.query(
        'SELECT * FROM counseling_notes WHERE student_id = ?',
        [student.id]
      );

      res.json({
        ...student,
        grades,
        achievements,
        certifications,
        counselingNotes,
      });
    } catch (error) {
      console.error('Error fetching student details:', error);
      res.status(500).json({ error: 'Failed to fetch student details', details: error.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection error', details: error.message });
  }
});

export default router;

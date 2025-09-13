import express from 'express';
import authenticateToken from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Apply authentication middleware to all faculty routes
router.use(authenticateToken);

// Apply authentication middleware to all faculty routes
router.use(authenticateToken);

// Get all students (no filtering by faculty)
router.get('/all-students', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const connection = await pool.getConnection();
    
    try {
      // Get filter parameters
      const { branch, semester } = req.query;
      
      console.log(`API: /faculty/all-students - branch: ${branch}, semester: ${semester}`);
      
      // Build query for all students
      let query = `SELECT * FROM students WHERE 1=1`;
      const queryParams = [];
      
      // Add branch filter if provided
      if (branch) {
        query += ` AND branch = ?`;
        queryParams.push(branch);
      }
      
      // Add semester filter if provided
      if (semester) {
        query += ` AND current_semester = ?`;
        queryParams.push(semester);
      }
      
      console.log(`API: Executing query: ${query} with params: ${queryParams}`);
      
      // Execute query
      const [students] = await connection.query(query, queryParams);
      console.log(`API: Returning ${students.length} students from all-students endpoint`);
      
      res.json(students);
    } catch (error) {
      console.error('Error fetching all students:', error);
      res.status(500).json({ 
        error: 'Failed to fetch students',
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

// Get only students assigned to the faculty (proctoring students)
router.get('/my-students', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get username from query parameter
      const username = req.query.username;
      
      // Get filter parameters
      const { branch, semester } = req.query;
      
      console.log(`API: /faculty/my-students - username: ${username}, branch: ${branch}, semester: ${semester}`);
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      // Create faculty_username_mapping table if it doesn't exist
      try {
        const [tableCheck] = await connection.query(`
          SELECT COUNT(*) as table_exists 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'faculty_username_mapping'
        `);
        
        const tableExists = tableCheck[0].table_exists > 0;
        console.log(`API: faculty_username_mapping table exists: ${tableExists}`);
        
        if (!tableExists) {
          console.log(`API: Creating faculty_username_mapping table`);
          
          // Create the table if it doesn't exist
          await connection.query(`
            CREATE TABLE IF NOT EXISTS faculty_username_mapping (
              id INT AUTO_INCREMENT PRIMARY KEY,
              faculty_username VARCHAR(50) NOT NULL,
              registration_number VARCHAR(20) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY unique_mapping (faculty_username, registration_number)
            )
          `);
          
          // Add sample data for testing
          await connection.query(`
            INSERT IGNORE INTO faculty_username_mapping (faculty_username, registration_number)
            SELECT 
              'faculty',
              registration_number
            FROM 
              students
            LIMIT 10
          `);
          
          console.log(`API: Added sample data to faculty_username_mapping table`);
        }
        
        // Check if there are any mappings for this username
        const [mappingCheck] = await connection.query(`
          SELECT COUNT(*) as mapping_count 
          FROM faculty_username_mapping 
          WHERE faculty_username = ?
        `, [username]);
        
        const mappingCount = mappingCheck[0].mapping_count;
        console.log(`API: Found ${mappingCount} mappings for username: ${username}`);
        
        if (mappingCount === 0) {
          console.log(`API: No mappings found, adding sample data for ${username}`);
          
          // Add sample data for this username
          await connection.query(`
            INSERT IGNORE INTO faculty_username_mapping (faculty_username, registration_number)
            SELECT 
              ?,
              registration_number
            FROM 
              students
            LIMIT 5
          `, [username]);
          
          console.log(`API: Added 5 sample mappings for ${username}`);
        }
      } catch (error) {
        console.error('Error checking or creating faculty_username_mapping table:', error);
      }
      
      // Build query for faculty's students
      let query = `
        SELECT s.* 
        FROM students s
        JOIN faculty_username_mapping fum ON s.registration_number = fum.registration_number
        WHERE fum.faculty_username = ?
      `;
      const queryParams = [username];
      
      // Add branch filter if provided
      if (branch) {
        query += ` AND s.branch = ?`;
        queryParams.push(branch);
      }
      
      // Add semester filter if provided
      if (semester) {
        query += ` AND s.current_semester = ?`;
        queryParams.push(semester);
      }
      
      console.log(`API: Executing query: ${query} with params: ${queryParams}`);
      
      // Execute query
      const [students] = await connection.query(query, queryParams);
      console.log(`API: Returning ${students.length} students from my-students endpoint`);
      
      res.json(students);
    } catch (error) {
      console.error('Error fetching faculty students:', error);
      res.status(500).json({ 
        error: 'Failed to fetch students',
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

// Faculty dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get username from query parameter
      const username = req.query.username;
      
      // Get filter parameter
      const filter = req.query.filter;
      
      console.log(`API: /faculty/dashboard - username: ${username}, filter: ${filter}`);


      // Get faculty ID from username
      let facultyId = null;
      try {
        const [userResult] = await connection.query(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );
        
        if (userResult.length > 0) {
          facultyId = userResult[0].id;
        }
      } catch (error) {
        console.log('Error getting faculty ID from username:', error.message);
      }
      
      // Return dashboard data based on filter
      if (filter === 'proctoring') {
        // Return data for proctoring students
        // This will be implemented in the dashboard endpoint
      } else {
        // Return data for all students
        // This will be implemented in the dashboard endpoint
      }
      
      // Return mock data for now
      res.json({
        stats: {
          totalStudents: filter === 'all' ? 245 : 45,
          avgCGPA: 7.8,
          achievements: filter === 'all' ? 78 : 32,
          certifications: filter === 'all' ? 56 : 18
        },
        topStudents: [
          { id: 1, name: 'Anusuri Bharathi', regNo: '22A91A6102', cgpa: 9.8, achievements: 5 },
          { id: 2, name: 'Akella Venkata', regNo: '22A91A6101', cgpa: 9.6, achievements: 4 },
          { id: 3, name: 'Ari Naresh', regNo: '22A91A6103', cgpa: 9.5, achievements: 3 },
          { id: 4, name: 'Arugollu Lalu Prasad', regNo: '22A91A6104', cgpa: 9.4, achievements: 3 },
          { id: 5, name: 'Ayushi Singh', regNo: '22A91A6105', cgpa: 9.3, achievements: 2 }
        ],
        recentActivities: [
          { id: 1, type: 'achievement', student: 'Anusuri Bharathi', title: 'Won coding competition', date: '2024-05-15' },
          { id: 2, type: 'certification', student: 'Akella Venkata', title: 'AWS Certified Developer', date: '2024-05-10' },
          { id: 3, type: 'achievement', student: 'Ari Naresh', title: 'Published research paper', date: '2024-05-05' },
          { id: 4, type: 'certification', student: 'Arugollu Lalu Prasad', title: 'Microsoft Azure Fundamentals', date: '2024-05-01' }
        ],
        studentPerformance: {
          labels: ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4'],
          datasets: [
            {
              label: 'Average SGPA',
              data: [8.2, 8.5, 8.3, 8.7],
              borderColor: '#4568dc',
              backgroundColor: 'rgba(69, 104, 220, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        },
        branchDistribution: [
          { branch: 'CSE', count: filter === 'all' ? 120 : 20 },
          { branch: 'ECE', count: filter === 'all' ? 85 : 15 },
          { branch: 'IT', count: filter === 'all' ? 65 : 5 },
          { branch: 'MECH', count: filter === 'all' ? 45 : 3 },
          { branch: 'CIVIL', count: filter === 'all' ? 30 : 2 }
        ]
      });
    } catch (error) {
      console.error('Error fetching faculty dashboard data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch dashboard data',
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
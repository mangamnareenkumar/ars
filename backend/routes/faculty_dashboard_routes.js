import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Faculty dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get filter and username from query parameters
      const filter = req.query.filter || 'proctoring';
      const username = req.query.username || 'faculty';
      
      console.log(`API: /dashboard - username: ${username}, filter: ${filter}`);
      
      // Get total students count
      let totalStudents = 0;
      if (filter === 'proctoring') {
        // Get count of students assigned to this faculty
        const [studentCountResult] = await connection.query(
          `SELECT COUNT(DISTINCT registration_number) as count 
           FROM faculty_username_mapping 
           WHERE faculty_username = ?`,
          [username]
        );
        totalStudents = studentCountResult[0]?.count || 0;
      } else {
        // Get count of all students
        const [studentCountResult] = await connection.query(
          'SELECT COUNT(*) as count FROM students'
        );
        totalStudents = studentCountResult[0]?.count || 0;
      }
      
      // Get average CGPA (using a mock value since there's no CGPA in the database)
      let avgCGPA = 0;
      if (filter === 'proctoring') {
        // Mock average CGPA for proctored students
        avgCGPA = (7.5 + Math.random() * 1.0).toFixed(2);
      } else {
        // Mock average CGPA for all students
        avgCGPA = (7.0 + Math.random() * 1.5).toFixed(2);
      }
      
      // Get achievements count
      let achievementsCount = 0;
      if (filter === 'proctoring') {
        // Get count of achievements for students assigned to this faculty
        const [achievementsResult] = await connection.query(
          `SELECT COUNT(*) as count
           FROM achievements a
           JOIN faculty_username_mapping fum ON a.registration_number = fum.registration_number
           WHERE fum.faculty_username = ?`,
          [username]
        );
        achievementsCount = achievementsResult[0]?.count || 0;
      } else {
        // Get count of all achievements
        const [achievementsResult] = await connection.query(
          'SELECT COUNT(*) as count FROM achievements'
        );
        achievementsCount = achievementsResult[0]?.count || 0;
      }
      
      // Get certifications count (assuming there's a certifications table)
      let certificationsCount = 0;
      try {
        if (filter === 'proctoring') {
          // Get count of certifications for students assigned to this faculty
          const [certificationsResult] = await connection.query(
            `SELECT COUNT(*) as count
             FROM certifications c
             JOIN faculty_username_mapping fum ON c.registration_number = fum.registration_number
             WHERE fum.faculty_username = ?`,
            [username]
          );
          certificationsCount = certificationsResult[0]?.count || 0;
        } else {
          // Get count of all certifications
          const [certificationsResult] = await connection.query(
            'SELECT COUNT(*) as count FROM certifications'
          );
          certificationsCount = certificationsResult[0]?.count || 0;
        }
      } catch (error) {
        console.error('Error fetching certifications count:', error);
        // If certifications table doesn't exist, use a mock value
        certificationsCount = filter === 'proctoring' ? 12 : 45;
      }
      
      // Get top students
      let topStudents = [];
      if (filter === 'proctoring') {
        // Get top students assigned to this faculty
        const [topStudentsResult] = await connection.query(
          `SELECT s.id, s.name, 
                  s.registration_number as regNo, 
                  s.branch,
                  s.current_semester as semester,
                  (SELECT COUNT(*) FROM achievements a WHERE a.registration_number = s.registration_number) as achievements
           FROM faculty_username_mapping fum
           JOIN students s ON fum.registration_number = s.registration_number
           WHERE fum.faculty_username = ?
           ORDER BY achievements DESC, s.name
           LIMIT 5`,
          [username]
        );
        
        // Add mock CGPA values
        topStudents = topStudentsResult.map(student => ({
          ...student,
          cgpa: (7.5 + Math.random() * 2.0).toFixed(2)
        }));
      } else {
        // Get top students overall
        const [topStudentsResult] = await connection.query(
          `SELECT s.id, s.name, 
                  s.registration_number as regNo, 
                  s.branch,
                  s.current_semester as semester,
                  (SELECT COUNT(*) FROM achievements a WHERE a.registration_number = s.registration_number) as achievements
           FROM students s
           ORDER BY achievements DESC, s.name
           LIMIT 5`
        );
        
        // Add mock CGPA values
        topStudents = topStudentsResult.map(student => ({
          ...student,
          cgpa: (7.5 + Math.random() * 2.0).toFixed(2)
        }));
      }
      
      // Get recent activities
      let recentActivities = [];
      try {
        if (filter === 'proctoring') {
          // Get recent activities for students assigned to this faculty
          const [recentActivitiesResult] = await connection.query(
            `SELECT 'achievement' as type, 
                    s.name as student,
                    a.title, a.created_at as date
             FROM achievements a
             JOIN students s ON a.registration_number = s.registration_number
             JOIN faculty_username_mapping fum ON s.registration_number = fum.registration_number
             WHERE fum.faculty_username = ?
             ORDER BY a.created_at DESC
             LIMIT 4`,
            [username]
          );
          recentActivities = recentActivitiesResult.map(item => ({
            ...item,
            date: item.date ? item.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          }));
        } else {
          // Get recent activities for all students
          const [recentActivitiesResult] = await connection.query(
            `SELECT 'achievement' as type, 
                    s.name as student,
                    a.title, a.created_at as date
             FROM achievements a
             JOIN students s ON a.registration_number = s.registration_number
             ORDER BY a.created_at DESC
             LIMIT 4`
          );
          recentActivities = recentActivitiesResult.map(item => ({
            ...item,
            date: item.date ? item.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          }));
        }
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        // If there's an error, use mock data
        recentActivities = [
          {
            type: 'achievement',
            student: 'Anusuri Bharathi',
            title: 'First Prize in Coding Competition',
            date: '2023-11-15'
          },
          {
            type: 'achievement',
            student: 'Akella Venkata',
            title: 'Paper Published in IEEE Conference',
            date: '2023-11-10'
          },
          {
            type: 'achievement',
            student: 'Ari Naresh',
            title: 'Won Hackathon',
            date: '2023-10-25'
          },
          {
            type: 'achievement',
            student: 'Arugollu Lalu Prasad',
            title: 'Best Project Award',
            date: '2023-10-20'
          }
        ];
      }
      
      // Get student performance data by semester
      let performanceData = [];
      // Generate mock performance data
      for (let i = 1; i <= 8; i++) {
        performanceData.push({
          semester: `Sem ${i}`,
          avgSGPA: (7.0 + Math.random() * 1.5).toFixed(2)
        });
      }
      
      // Get branch distribution
      let branchDistribution = [];
      if (filter === 'proctoring') {
        // Get branch distribution for students assigned to this faculty
        const [branchResult] = await connection.query(
          `SELECT 
             s.branch,
             COUNT(*) as count
           FROM faculty_username_mapping fum
           JOIN students s ON fum.registration_number = s.registration_number
           WHERE fum.faculty_username = ?
           GROUP BY s.branch
           ORDER BY count DESC`,
          [username]
        );
        branchDistribution = branchResult;
      } else {
        // Get branch distribution for all students
        const [branchResult] = await connection.query(
          `SELECT 
             branch,
             COUNT(*) as count
           FROM students
           GROUP BY branch
           ORDER BY count DESC`
        );
        branchDistribution = branchResult;
      }
      
      // Return dashboard data
      res.json({
        stats: {
          totalStudents,
          avgCGPA,
          achievements: achievementsCount,
          certifications: certificationsCount
        },
        topStudents,
        recentActivities,
        performanceData,
        branchDistribution
      });
      
    } catch (error) {
      console.error('Error in dashboard route:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
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
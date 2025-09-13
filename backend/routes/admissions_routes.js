import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get admissions analytics with filters
router.get('/analytics', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get filter parameters
      const { branch, gender, seatType, state, country } = req.query;
      
      // Build WHERE clause for filters
      let whereClause = '';
      const params = [];
      
      if (branch || gender || seatType || state || country) {
        whereClause = 'WHERE ';
        const conditions = [];
        
        if (branch) {
          conditions.push('branch = ?');
          params.push(branch);
        }
        
        if (gender) {
          conditions.push('gender = ?');
          params.push(gender);
        }
        
        if (seatType) {
          conditions.push('seat_type = ?');
          params.push(seatType);
        }
        
        if (state) {
          conditions.push('state = ?');
          params.push(state);
        }
        
        if (country) {
          conditions.push('country = ?');
          params.push(country);
        }
        
        whereClause += conditions.join(' AND ');
      }
      
      // Get total admissions count
      const [totalResult] = await connection.query(
        `SELECT COUNT(*) as total FROM admissions ${whereClause}`,
        params
      );
      const totalAdmissions = totalResult[0].total;
      
      // Get admissions by branch
      const [branchResult] = await connection.query(
        `SELECT branch, COUNT(*) as count 
         FROM admissions 
         ${whereClause}
         GROUP BY branch 
         ORDER BY count DESC`,
        params
      );
      
      const admissionsByBranch = {
        labels: branchResult.map(item => item.branch),
        data: branchResult.map(item => item.count)
      };
      
      // Get admissions by gender
      const [genderResult] = await connection.query(
        `SELECT gender, COUNT(*) as count 
         FROM admissions 
         ${whereClause}
         GROUP BY gender 
         ORDER BY count DESC`,
        params
      );
      
      const admissionsByGender = {
        labels: genderResult.map(item => item.gender),
        data: genderResult.map(item => item.count)
      };
      
      // Get admissions by seat type
      const [seatTypeResult] = await connection.query(
        `SELECT seat_type, COUNT(*) as count 
         FROM admissions 
         ${whereClause}
         GROUP BY seat_type 
         ORDER BY count DESC`,
        params
      );
      
      const admissionsBySeatType = {
        labels: seatTypeResult.map(item => item.seat_type),
        data: seatTypeResult.map(item => item.count)
      };
      
      // Get admissions by state
      const [stateResult] = await connection.query(
        `SELECT state, COUNT(*) as count 
         FROM admissions 
         ${whereClause}
         GROUP BY state 
         ORDER BY count DESC 
         LIMIT 6`,
        params
      );
      
      const admissionsByState = {
        labels: stateResult.map(item => item.state),
        data: stateResult.map(item => item.count)
      };
      
      // Get admissions by country
      const [countryResult] = await connection.query(
        `SELECT country, COUNT(*) as count 
         FROM admissions 
         ${whereClause}
         GROUP BY country 
         ORDER BY count DESC`,
        params
      );
      
      const admissionsByCountry = {
        labels: countryResult.map(item => item.country),
        data: countryResult.map(item => item.count)
      };
      
      // Return all analytics data
      res.json({
        totalAdmissions,
        admissionsByBranch,
        admissionsByGender,
        admissionsBySeatType,
        admissionsByState,
        admissionsByCountry
      });
      
    } catch (error) {
      console.error('Error fetching admissions analytics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch admissions analytics',
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

// Get raw admissions data (paginated) with filters
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const offset = page * limit;
      
      // Get filter parameters
      const { branch, gender, seatType, state, country } = req.query;
      
      // Build WHERE clause for filters
      let whereClause = '';
      const params = [];
      
      if (branch || gender || seatType || state || country) {
        whereClause = 'WHERE ';
        const conditions = [];
        
        if (branch) {
          conditions.push('branch = ?');
          params.push(branch);
        }
        
        if (gender) {
          conditions.push('gender = ?');
          params.push(gender);
        }
        
        if (seatType) {
          conditions.push('seat_type = ?');
          params.push(seatType);
        }
        
        if (state) {
          conditions.push('state = ?');
          params.push(state);
        }
        
        if (country) {
          conditions.push('country = ?');
          params.push(country);
        }
        
        whereClause += conditions.join(' AND ');
      }
      
      // Get total count with filters
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total FROM admissions ${whereClause}`,
        params
      );
      const total = countResult[0].total;
      
      // Get paginated data with filters
      const paginationParams = [...params, limit, offset];
      const [admissions] = await connection.query(
        `SELECT * FROM admissions
         ${whereClause}
         LIMIT ? OFFSET ?`,
        paginationParams
      );
      
      res.json({
        total,
        page,
        limit,
        data: admissions
      });
      
    } catch (error) {
      console.error('Error fetching admissions data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch admissions data',
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

// Get filter options (unique values for each filter field)
router.get('/filter-options', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get unique branches
      const [branches] = await connection.query(
        'SELECT DISTINCT branch FROM admissions ORDER BY branch'
      );
      
      // Get unique genders
      const [genders] = await connection.query(
        'SELECT DISTINCT gender FROM admissions ORDER BY gender'
      );
      
      // Get unique seat types
      const [seatTypes] = await connection.query(
        'SELECT DISTINCT seat_type FROM admissions ORDER BY seat_type'
      );
      
      // Get unique states
      const [states] = await connection.query(
        'SELECT DISTINCT state FROM admissions ORDER BY state'
      );
      
      // Get unique countries
      const [countries] = await connection.query(
        'SELECT DISTINCT country FROM admissions ORDER BY country'
      );
      
      res.json({
        branches: branches.map(item => item.branch),
        genders: genders.map(item => item.gender),
        seatTypes: seatTypes.map(item => item.seat_type),
        states: states.map(item => item.state),
        countries: countries.map(item => item.country)
      });
      
    } catch (error) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({ 
        error: 'Failed to fetch filter options',
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
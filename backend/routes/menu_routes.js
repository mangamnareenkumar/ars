import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get menu items for faculty dashboard
router.get('/faculty', async (req, res) => {
  try {
    // Return menu items from database
    res.json([
      { 
        title: 'Students', 
        icon: 'PeopleIcon', 
        color: '#4568dc', 
        path: '/faculty/students',
        description: 'Manage and view student details'
      },
      { 
        title: 'Achievements', 
        icon: 'EmojiEventsIcon', 
        color: '#4caf50', 
        path: '/faculty/achievements',
        description: 'Track student achievements'
      },
      { 
        title: 'Certifications', 
        icon: 'CardMembershipIcon', 
        color: '#b06ab3', 
        path: '/faculty/certifications',
        description: 'Manage student certifications'
      },
      { 
        title: 'Admissions', 
        icon: 'SchoolIcon', 
        color: '#2196f3', 
        path: '/faculty/admissions',
        description: 'View admissions analytics'
      },
      { 
        title: 'Reports', 
        icon: 'AssessmentIcon', 
        color: '#ff9800', 
        path: '/faculty/reports',
        description: 'Generate and view reports'
      },
      { 
        title: 'Counseling', 
        icon: 'ChatIcon', 
        color: '#2196f3', 
        path: '/faculty/counseling',
        description: 'Student counseling notes'
      },
      { 
        title: 'Calendar', 
        icon: 'CalendarMonthIcon', 
        color: '#f44336', 
        path: '/faculty/calendar',
        description: 'View academic calendar'
      },
      { 
        title: 'Calendar Admin', 
        icon: 'EditIcon', 
        color: '#2196f3', 
        path: '/faculty/calendar-admin',
        description: 'Manage academic calendar',
        adminOnly: true
      }
    ]);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

export default router;
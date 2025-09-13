import { getSemesterPerformanceReport } from '../services/studentPerformance.js';

export const semesterPerformanceController = async (req, res) => {
  try {
    const data = await getSemesterPerformanceReport(req.params.regNo, req.query);
    res.json(data);
  } catch (error) {
    console.error('Semester performance error:', error);
    res.status(500).json({
      error: 'Failed to generate semester performance report',
      details: error.message
    });
  }
};

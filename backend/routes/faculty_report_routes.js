import express from 'express';
import authenticateToken from '../middleware/auth.js';
import path from 'path';
import { generatePdfController, previewPdfController, downloadPdfController } from '../controllers/pdfController.js';
import { semesterPerformanceController } from '../controllers/performanceController.js';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

dotenv.config();


const router = express.Router();
const __dirname = import.meta.dirname;

// Serve static files from images directory
router.use('/images', express.static(path.join(__dirname, '..', 'public')));

router.get('/generate-pdf/:regNo', generatePdfController);

router.get('/preview-pdf', previewPdfController);

router.get('/download-pdf', downloadPdfController);

// Skipped authentication for report generation
// Apply authentication middleware to all other routes
router.use(authenticateToken);

// Handle Excel generation directly
router.get('/excel', async (req, res) => {
  try {
    const students = req.query.students?.split(',') || [];
    const columns = req.query.columns?.split(',') || [];

    if (students.length === 0 || columns.length === 0) {
      return res.status(400).json({ message: 'Missing students or columns' });
    }

    // Fetch actual student data here based on selected columns (e.g., from DB)
    // Example data
    const data = [
      {
        registered_no: '21A91A04F1',
        name: 'Alice',
        branch: 'CSE',
        curr_semester: '5',
        sgpa: '8.1',
        cgpa: '8.0',
        attendance: '90%'
      },
      {
        registered_no: '21A91A04F2',
        name: 'Bob',
        branch: 'ECE',
        curr_semester: '5',
        sgpa: '7.9',
        cgpa: '7.8',
        attendance: '88%'
      }
    ];

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Define headers dynamically
    worksheet.columns = columns.map(col => ({
      header: col.replace(/_/g, ' ').toUpperCase(),
      key: col,
      width: 20
    }));

    // Add filtered student rows
    data.forEach(student => {
      const row = {};
      columns.forEach(col => {
        row[col] = student[col] || ''; // fallback to empty if missing
      });
      worksheet.addRow(row);
    });

    // Set headers and stream
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel generation error:', err);
    res.status(500).json({ message: 'Failed to generate Excel file' });
  }
});




// Handle CSV generation directly
router.use('/csv', (req, res, next) => {
  res.send('CSV report generation is not implemented yet');
});

// Report types endpoint
router.get('/types', (req, res) => {
  const reportTypes = [
    { id: 'semester', name: 'Semester Performance Report' },
    { id: 'cumulative', name: 'Cumulative Performance Report' },
    { id: 'subject', name: 'Subject Analysis Report' },
    { id: 'achievements', name: 'Achievements Report' },
    { id: 'certifications', name: 'Certifications Report' },
    { id: 'backlog', name: 'Backlog Management Report' }
  ];

  res.json(reportTypes);
});

// Get semester performance report
router.get('/semester-performance/:regNo', semesterPerformanceController);


router.get('/cumulative-performance/:regNo', async (req, res) => {
  // Existing implementation
});

router.get('/subject-analysis/:regNo', async (req, res) => {
  // Existing implementation
});

router.get('/achievements/:regNo', async (req, res) => {
  // Existing implementation
});

router.get('/certifications/:regNo', async (req, res) => {
  // Existing implementation
});

export default router;
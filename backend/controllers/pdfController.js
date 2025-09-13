import { getStudentSemesterPerformance } from '../services/fetchReportData.js';
import { generatePerformanceChart, generateGradeDistributionChart, getLetterGrade } from '../services/chartService.js';
import { generateCombinedHtmlReport, handleDownloadPdf} from '../services/pdfService.js';

import ejs from 'ejs';
import path from 'path';

const __dirname = import.meta.dirname;

export const generatePdfController = async (req, res) => {
  const { regNo } = req.params;
  const { type = 'semester', template = 'classic', includeCharts = false } = req.query;

  if (!regNo) {
    return res.status(400).json({ error: 'Registration number is required' });
  }

  try {
    const { student, semesterGrades, cgpa, sgpaBySemester } = await getStudentSemesterPerformance(regNo);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const reportData = {
      student,
      semesterGrades,
      sgpaBySemester,
      cgpa,
      headerLogo: `${baseUrl}/api/reports/images/header.png`,
      studentPhoto: `${baseUrl}/api/reports/images/student-images/${student.registration_number}.jpg`,
      reportType: type,
      includeCharts: includeCharts === 'true',
      templateStyle: template
    };

   const performanceSVG = generatePerformanceChart(reportData.sgpaBySemester);
   const gradeDistSVG = generateGradeDistributionChart(reportData.semesterGrades);

   const html = await ejs.renderFile(
      path.join(__dirname, '../views/pdf_classic.ejs'),
      {
        ...reportData,
        student,
        semesterGrades,
        cgpa,
        type,
        template,
        includeCharts,
        getLetterGrade,
        performanceSVG,
        gradeDistSVG
      }
    );
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate report', message: error.message });
  }
};


export const previewPdfController = async (req, res) => {
  const { students = '', type = 'semester', template = 'classic', includeCharts = false } = req.query;
  const regNos = students.split(',').map(s => s.trim()).filter(Boolean);

  if (regNos.length === 0) {
    return res.status(400).json({ error: 'No student registration numbers provided' });
  }

  try {
    const fullHtml = await generateCombinedHtmlReport(regNos, req, type, template, includeCharts);
    res.setHeader('Content-Type', 'text/html');
    res.send(fullHtml);
  } catch (error) {
    console.error('Error generating batch report:', error);
    res.status(500).json({ error: 'Failed to generate batch report' });
  }
};


export const downloadPdfController = async (req, res) => {
  try {
    await handleDownloadPdf(req, res);
  } catch (err) {
    console.error('Error generating/downloading PDF:', err);
    res.status(500).send('Failed to generate report.');
  }
};

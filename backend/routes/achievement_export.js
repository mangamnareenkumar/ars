import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to get achievements from database
async function getAchievements(filters = {}) {
  const connection = await pool.getConnection();
  try {
    let query = `
      SELECT a.*, s.name as student_name 
      FROM achievements a
      LEFT JOIN students s ON a.registration_number = s.registration_number
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (filters.categories && filters.categories.length > 0) {
      query += ` AND a.category IN (${filters.categories.map(() => '?').join(',')})`;
      queryParams.push(...filters.categories);
    }
    
    if (filters.timeRange && filters.timeRange !== 'all') {
      let dateFilter;
      const now = new Date();
      
      switch (filters.timeRange) {
        case 'month':
          dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          dateFilter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          dateFilter = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (dateFilter) {
        query += ` AND a.achievement_date >= ?`;
        queryParams.push(dateFilter.toISOString().split('T')[0]);
      }
    }
    
    query += ` ORDER BY a.achievement_date DESC`;
    
    const [achievements] = await connection.query(query, queryParams);
    return achievements;
  } finally {
    connection.release();
  }
}

// Helper function to get achievement statistics
async function getAchievementStats() {
  const connection = await pool.getConnection();
  try {
    const [categoryStats] = await connection.query(`
      SELECT category, COUNT(*) as count
      FROM achievements
      GROUP BY category
      ORDER BY count DESC
    `);
    
    return { categoryStats };
  } finally {
    connection.release();
  }
}

// Function to draw a pie chart in PDF
function drawPieChart(doc, data, x, y, radius, colors) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;
  
  // Draw pie slices
  data.forEach((item, index) => {
    const sliceAngle = (item.count / total) * 2 * Math.PI;
    const color = colors[index % colors.length];
    
    // Draw slice
    doc.save()
       .moveTo(x, y)
       .arc(x, y, radius, currentAngle, currentAngle + sliceAngle, false)
       .lineTo(x, y)
       .fillColor(color)
       .fill()
       .restore();
    
    currentAngle += sliceAngle;
  });
  
  // Draw white circle in the middle for donut effect
  doc.circle(x, y, radius * 0.6)
     .fillColor('white')
     .fill();
  
  // Draw legend
  let legendY = y - radius;
  data.forEach((item, index) => {
    const color = colors[index % colors.length];
    const percentage = Math.round((item.count / total) * 100);
    
    // Draw color box
    doc.rect(x + radius + 20, legendY, 15, 15)
       .fillColor(color)
       .fill();
    
    // Draw text
    doc.fillColor('black')
       .fontSize(10)
       .text(`${item.category}: ${item.count} (${percentage}%)`, 
             x + radius + 40, legendY + 3);
    
    legendY += 20;
  });
}

// Export to PDF
router.get('/pdf', async (req, res) => {
  try {
    const categories = req.query.categories ? req.query.categories.split(',') : [];
    const timeRange = req.query.timeRange || 'all';
    const includeDetails = req.query.includeDetails === 'true';
    const includeCharts = req.query.includeCharts === 'true';
    
    const achievements = await getAchievements({ categories, timeRange });
    const stats = includeCharts ? await getAchievementStats() : null;
    
    // Create PDF document with better formatting
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=achievements.pdf');
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add header with logo and title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Achievement Report', { align: 'center' });
    
    doc.moveDown()
       .fontSize(12)
       .font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    
    doc.moveDown(2);
    
    // Add filter information in a box
    doc.rect(50, doc.y, 495, 60)
       .fillColor('#f5f5f5')
       .fill();
    
    doc.fillColor('#000')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Filter Criteria:', 55, doc.y - 55);
    
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Time Range: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`, 55, doc.y + 5)
       .text(`Categories: ${categories.length > 0 ? categories.join(', ') : 'All'}`, 55);
    
    doc.moveDown(2);
    
    // Add statistics if requested
    if (includeCharts && stats && stats.categoryStats.length > 0) {
      doc.addPage();
      
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('Achievement Statistics', { align: 'center' });
      
      doc.moveDown();
      
      // Category distribution as pie chart
      doc.fontSize(16)
         .text('Category Distribution', { align: 'center' });
      
      doc.moveDown();
      
      // Define colors for pie chart
      const colors = ['#4568dc', '#b06ab3', '#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];
      
      // Draw pie chart
      drawPieChart(
        doc, 
        stats.categoryStats, 
        doc.page.width / 2, 
        doc.y + 120, 
        100, 
        colors
      );
      
      // Move down past the pie chart
      doc.moveDown(15);
    }
    
    // Add achievements list
    doc.addPage();
    
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Achievement List', { align: 'center' });
    
    doc.moveDown();
    
    // Table headers with background
    const tableTop = doc.y;
    doc.rect(50, tableTop - 5, 495, 25)
       .fillColor('#4568dc')
       .fill();
    
    doc.fillColor('#ffffff')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Student', 60, tableTop)
       .text('Achievement', 200, tableTop)
       .text('Category', 350, tableTop)
       .text('Date', 450, tableTop);
    
    doc.fillColor('#000000')
       .font('Helvetica');
    
    let rowTop = tableTop + 25;
    let alternate = false;
    
    achievements.forEach((achievement, index) => {
      // Add new page if needed
      if (rowTop > doc.page.height - 100) {
        doc.addPage();
        rowTop = 50;
        
        // Repeat headers on new page
        doc.rect(50, rowTop - 5, 495, 25)
           .fillColor('#4568dc')
           .fill();
        
        doc.fillColor('#ffffff')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('Student', 60, rowTop)
           .text('Achievement', 200, rowTop)
           .text('Category', 350, rowTop)
           .text('Date', 450, rowTop);
        
        doc.fillColor('#000000')
           .font('Helvetica');
        
        rowTop += 25;
      }
      
      // Alternate row background
      if (alternate) {
        doc.rect(50, rowTop - 5, 495, 25)
           .fillColor('#f5f5f5')
           .fill();
      }
      
      doc.fillColor('#000000')
         .fontSize(10)
         .text(achievement.student_name, 60, rowTop)
         .text(achievement.title, 200, rowTop)
         .text(achievement.category, 350, rowTop)
         .text(new Date(achievement.achievement_date).toLocaleDateString(), 450, rowTop);
      
      if (includeDetails && achievement.description) {
        rowTop += 20;
        doc.fontSize(9)
           .font('Helvetica-Oblique')
           .text(`Description: ${achievement.description}`, 70, rowTop, {
             width: 450,
             align: 'left'
           });
        rowTop += 20;
      } else {
        rowTop += 25;
      }
      
      alternate = !alternate;
    });
    
    // Add page numbers
    let pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(10)
         .text(
           `Page ${i + 1} of ${pages.count}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
    }
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Failed to export achievements to PDF' });
  }
});

// Export to Excel and CSV routes
router.get('/excel', async (req, res) => {
  try {
    // Parse filters from query parameters
    const categories = req.query.categories ? req.query.categories.split(',') : [];
    const timeRange = req.query.timeRange || 'all';
    const includeDetails = req.query.includeDetails === 'true';
    
    // Get achievements from database
    const achievements = await getAchievements({ categories, timeRange });
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Achievements');
    
    // Define columns
    const columns = [
      { header: 'Student Name', key: 'student_name', width: 20 },
      { header: 'Registration Number', key: 'registration_number', width: 20 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Date', key: 'achievement_date', width: 15 },
      { header: 'Scope', key: 'scope', width: 20 }
    ];
    
    // Add description column if includeDetails is true
    if (includeDetails) {
      columns.push({ header: 'Description', key: 'description', width: 40 });
    }
    
    worksheet.columns = columns;
    
    // Add data
    achievements.forEach(achievement => {
      const row = {
        student_name: achievement.student_name,
        registration_number: achievement.registration_number,
        title: achievement.title,
        category: achievement.category,
        achievement_date: achievement.achievement_date,
        scope: achievement.scope
      };
      
      if (includeDetails) {
        row.description = achievement.description;
      }
      
      worksheet.addRow(row);
    });
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Set the response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=achievements.xlsx');
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Failed to export achievements to Excel' });
  }
});

router.get('/csv', async (req, res) => {
  try {
    // Parse filters from query parameters
    const categories = req.query.categories ? req.query.categories.split(',') : [];
    const timeRange = req.query.timeRange || 'all';
    const includeDetails = req.query.includeDetails === 'true';
    
    // Get achievements from database
    const achievements = await getAchievements({ categories, timeRange });
    
    // Define CSV headers
    const headers = [
      { id: 'student_name', title: 'Student Name' },
      { id: 'registration_number', title: 'Registration Number' },
      { id: 'title', title: 'Title' },
      { id: 'category', title: 'Category' },
      { id: 'achievement_date', title: 'Date' },
      { id: 'scope', title: 'Scope' }
    ];
    
    // Add description header if includeDetails is true
    if (includeDetails) {
      headers.push({ id: 'description', title: 'Description' });
    }
    
    // Create a temporary file path
    const filePath = path.join(__dirname, '../exports', `achievements_${Date.now()}.csv`);
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });
    
    // Write data
    await csvWriter.writeRecords(achievements);
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=achievements.csv');
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Delete the file after sending
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temporary CSV file:', err);
      });
    });
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({ error: 'Failed to export achievements to CSV' });
  }
});

export default router;
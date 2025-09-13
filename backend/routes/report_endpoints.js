// import express from 'express';
// import pool from '../config/database.js';
// import path from 'path';
// import fs from 'fs';

// const router = express.Router();

// // Middleware to check token in query params for direct downloads
// const checkTokenInQuery = (req, res, next) => {
//   const token = req.query.token;
  
//   if (!token) {
//     return res.status(401).json({ error: 'Access token is required' });
//   }
  
//   // Store token in request for later use
//   req.token = token;
//   next();
// };

// // Generate Excel report
// router.get('/', checkTokenInQuery, async (req, res) => {
//   try {
//     const { students, columns } = req.query;
    
//     if (!students || !columns) {
//       return res.status(400).json({ error: 'Students and columns are required' });
//     }
    
//     const studentIds = students.split(',');
//     const selectedColumns = columns.split(',');
    
//     const connection = await pool.getConnection();
    
//     try {
//       // Create headers
//       const headers = [];
//       selectedColumns.forEach(column => {
//         switch(column) {
//           case 'registered_no':
//             headers.push('Registration Number');
//             break;
//           case 'name':
//             headers.push('Name');
//             break;
//           case 'branch':
//             headers.push('Branch');
//             break;
//           case 'curr_semester':
//             headers.push('Current Semester');
//             break;
//           case 'sgpa':
//             headers.push('SGPA');
//             break;
//           case 'cgpa':
//             headers.push('CGPA');
//             break;
//           case 'attendance':
//             headers.push('Attendance');
//             break;
//           case 'backlog_count':
//             headers.push('Backlog Count');
//             break;
//           default:
//             headers.push(column);
//         }
//       });
      
//       // Create CSV content
//       let csvContent = headers.join(',') + '\\n';
      
//       // Add data for each student
//       for (const studentId of studentIds) {
//         const [students] = await connection.query(
//           'SELECT * FROM students WHERE registration_number = ?',
//           [studentId]
//         );
        
//         if (students.length === 0) {
//           continue;
//         }
        
//         const student = students[0];
        
//         // Get SGPA and CGPA data
//         const [sgpaCgpaData] = await connection.query(
//           'SELECT * FROM sgpa_cgpa WHERE registration_number = ? ORDER BY semester DESC LIMIT 1',
//           [studentId]
//         );
        
//         const sgpa = sgpaCgpaData.length > 0 ? sgpaCgpaData[0].sgpa : 0;
//         const cgpa = sgpaCgpaData.length > 0 ? sgpaCgpaData[0].cgpa : 0;
        
//         // Mock data for other fields
//         const attendance = '92%';
//         const backlogCount = '0';
        
//         // Add row for this student
//         const rowData = [];
//         selectedColumns.forEach(column => {
//           let value = '';
//           switch(column) {
//             case 'registered_no':
//               value = student.registration_number;
//               break;
//             case 'name':
//               value = student.name;
//               break;
//             case 'branch':
//               value = student.branch;
//               break;
//             case 'curr_semester':
//               value = student.curr_semester;
//               break;
//             case 'sgpa':
//               value = sgpa;
//               break;
//             case 'cgpa':
//               value = cgpa;
//               break;
//             case 'attendance':
//               value = attendance;
//               break;
//             case 'backlog_count':
//               value = backlogCount;
//               break;
//             default:
//               value = '';
//           }
          
//           // Escape commas in values
//           if (value && value.toString().includes(',')) {
//             value = `"${value}"`;
//           }
          
//           rowData.push(value);
//         });
        
//         csvContent += rowData.join(',') + '\\n';
//       }
      
//       // Create directory if it doesn't exist
//       const outputDir = path.join(__dirname, '..', 'exports');
//       if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//       }
      
//       // Generate filename with timestamp
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '');
//       const filename = `Student_Report_${timestamp}.csv`;
//       const filepath = path.join(outputDir, filename);
      
//       // Write to file
//       fs.writeFileSync(filepath, csvContent);
      
//       // Send file as download
//       res.download(filepath, filename, (err) => {
//         if (err) {
//           console.error('Error sending file:', err);
//         }
        
//         // Delete file after sending
//         fs.unlink(filepath, (unlinkErr) => {
//           if (unlinkErr) {
//             console.error('Error deleting file:', unlinkErr);
//           }
//         });
//       });
//     } catch (error) {
//       console.error('Error generating report:', error);
//       res.status(500).json({ 
//         error: 'Failed to generate report',
//         details: error.message
//       });
//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.error('Database connection error:', error);
//     res.status(500).json({ 
//       error: 'Database connection error',
//       details: error.message
//     });
//   }
// });

// // Report types endpoint
// router.get('/types', (req, res) => {
//   const reportTypes = [
//     { id: 'semester', name: 'Semester Performance Report' },
//     { id: 'cumulative', name: 'Cumulative Performance Report' },
//     { id: 'subject', name: 'Subject Analysis Report' },
//     { id: 'achievements', name: 'Achievements Report' },
//     { id: 'certifications', name: 'Certifications Report' },
//     { id: 'backlog', name: 'Backlog Management Report' }
//   ];
  
//   res.json(reportTypes);
// });

// // Generate PDF report with type parameter
// router.get('/generate-pdf/:regNo', checkTokenInQuery, async (req, res) => {
//   try {
//     const { regNo } = req.params;
//     const { type = 'semester', template = 'classic', includeCharts = false } = req.query;
    
//     if (!regNo) {
//       return res.status(400).json({ error: 'Registration number is required' });
//     }
    
//     const connection = await pool.getConnection();
    
//     try {
//       // Get student details
//       const [students] = await connection.query(
//         'SELECT * FROM students WHERE registration_number = ?',
//         [regNo]
//       );
      
//       if (students.length === 0) {
//         return res.status(404).json({ error: 'Student not found' });
//       }
      
//       const student = students[0];
      
//       // Get all grades for the student
//       const [allGrades] = await connection.query(`
//         SELECT 
//           g.*,
//           c.name as course_name,
//           c.code as course_code,
//           c.semester,
//           c.credits
//         FROM grades g
//         JOIN courses c ON g.course_code = c.code
//         WHERE g.registration_number = ?
//         ORDER BY c.semester, c.code
//       `, [regNo]);
      
//       // Get SGPA and CGPA from the sgpa_cgpa table
//       const [sgpaCgpaData] = await connection.query(`
//         SELECT * FROM sgpa_cgpa
//         WHERE registration_number = ?
//         ORDER BY semester
//       `, [regNo]);
      
//       // Group grades by semester
//       const semesterGrades = {};
//       allGrades.forEach(grade => {
//         const semester = grade.semester;
//         if (!semesterGrades[semester]) {
//           semesterGrades[semester] = [];
//         }
//         semesterGrades[semester].push(grade);
//       });
      
//       // Calculate CGPA
//       let totalGradePoints = 0;
//       let totalCredits = 0;
      
//       allGrades.forEach(grade => {
//         totalGradePoints += grade.grade_points * grade.credits;
//         totalCredits += grade.credits;
//       });
      
//       const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;
      
//       // Prepare data for template
//       const reportData = {
//         student: {
//           name: student.name,
//           registration_number: student.registration_number,
//           branch: student.branch,
//           curr_semester: student.curr_semester,
//           address_line1: student.address_line1 || '',
//           address_line2: student.address_line2 || '',
//           city: student.city || '',
//           state: student.state || '',
//           pincode: student.pincode || ''
//         },
//         semesterGrades,
//         sgpaBySemester: sgpaCgpaData.length > 0 ? sgpaCgpaData : 
//           Object.keys(semesterGrades).map(sem => ({
//             semester: parseInt(sem),
//             sgpa: parseFloat(calculateSGPA(semesterGrades[sem])),
//             earned_credits: calculateEarnedCredits(semesterGrades[sem])
//           })),
//         cgpa: parseFloat(cgpa),
//         headerLogo: path.join(process.cwd(), 'templates', 'images', 'header.png'),
//         reportType: type,
//         includeCharts: includeCharts === 'true',
//         templateStyle: template
//       };
      
//       // Generate HTML based on report type and template
//       let html = '';
      
//       // In a real implementation, you would have different templates for different report types
//       // For now, we'll use a simple HTML template for all report types
//       html = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <title>${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${student.name}</title>
//           <style>
//             body {
//               font-family: Arial, sans-serif;
//               margin: 0;
//               padding: 20px;
//               color: #333;
//             }
//             .header {
//               text-align: center;
//               margin-bottom: 30px;
//             }
//             .header img {
//               max-width: 200px;
//             }
//             h1 {
//               color: #4568dc;
//               margin-bottom: 5px;
//             }
//             .student-info {
//               margin-bottom: 30px;
//               border: 1px solid #ddd;
//               padding: 15px;
//               border-radius: 5px;
//             }
//             table {
//               width: 100%;
//               border-collapse: collapse;
//               margin-bottom: 30px;
//             }
//             th, td {
//               border: 1px solid #ddd;
//               padding: 8px;
//               text-align: left;
//             }
//             th {
//               background-color: #f2f2f2;
//             }
//             .footer {
//               margin-top: 50px;
//               text-align: center;
//               font-size: 12px;
//               color: #666;
//             }
//             .${template} {
//               ${template === 'modern' ? 'background-color: #f9f9f9;' : ''}
//               ${template === 'minimal' ? 'max-width: 800px; margin: 0 auto;' : ''}
//             }
//           </style>
//         </head>
//         <body class="${template}">
//           <div class="header">
//             <h1>Automated Reporting System</h1>
//             <h2>${type.charAt(0).toUpperCase() + type.slice(1)} Report</h2>
//           </div>
          
//           <div class="student-info">
//             <h3>Student Information</h3>
//             <p><strong>Name:</strong> ${student.name}</p>
//             <p><strong>Registration Number:</strong> ${student.registration_number}</p>
//             <p><strong>Branch:</strong> ${student.branch}</p>
//             <p><strong>Current Semester:</strong> ${student.curr_semester}</p>
//             <p><strong>CGPA:</strong> ${cgpa}</p>
//           </div>
          
//           <h3>Academic Performance</h3>
//           <table>
//             <thead>
//               <tr>
//                 <th>Semester</th>
//                 <th>SGPA</th>
//                 <th>Credits Earned</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${reportData.sgpaBySemester.map(sem => `
//                 <tr>
//                   <td>${sem.semester}</td>
//                   <td>${sem.sgpa}</td>
//                   <td>${sem.earned_credits || 0}</td>
//                 </tr>
//               `).join('')}
//             </tbody>
//           </table>
          
//           <h3>Course Details</h3>
//           <table>
//             <thead>
//               <tr>
//                 <th>Course Code</th>
//                 <th>Course Name</th>
//                 <th>Credits</th>
//                 <th>Grade Points</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${allGrades.map(grade => `
//                 <tr>
//                   <td>${grade.course_code}</td>
//                   <td>${grade.course_name}</td>
//                   <td>${grade.credits}</td>
//                   <td>${grade.grade_points}</td>
//                 </tr>
//               `).join('')}
//             </tbody>
//           </table>
          
//           <div class="footer">
//             <p>Generated on ${new Date().toLocaleDateString()} by Automated Reporting System</p>
//           </div>
//         </body>
//         </html>
//       `;
      
//       // Send HTML response
//       res.setHeader('Content-Type', 'text/html');
//       res.send(html);
      
//     } catch (error) {
//       console.error('Error generating PDF report:', error);
//       res.status(500).json({ 
//         error: 'Failed to generate PDF report',
//         details: error.message
//       });
//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.error('Database connection error:', error);
//     res.status(500).json({ 
//       error: 'Database connection error',
//       details: error.message
//     });
//   }
// });

// // Helper function to calculate SGPA
// function calculateSGPA(grades) {
//   let totalGradePoints = 0;
//   let totalCredits = 0;
  
//   grades.forEach(grade => {
//     totalGradePoints += grade.grade_points * grade.credits;
//     totalCredits += grade.credits;
//   });
  
//   return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
// }

// // Helper function to calculate earned credits
// function calculateEarnedCredits(grades) {
//   return grades.reduce((total, grade) => {
//     return total + (grade.grade_points >= 4.0 ? grade.credits : 0);
//   }, 0);
// }

// export default router;
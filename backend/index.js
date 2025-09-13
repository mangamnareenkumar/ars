import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';


// Route imports (all must use `.js` extension in ESM)
import studentRoutes from './routes/student_routes.js';
import studentsRoutes from './routes/students.js';
import achievementRoutes from './routes/achievement_routes.js';
import achievementExportRoutes from './routes/achievement_export.js';
import counselingRoutes from './routes/counseling_routes.js';
import facultyDashboardRoutes from './routes/faculty_dashboard_routes.js';
import facultyRoutes from './routes/faculty_routes.js';
import authRoutes from './routes/auth_routes.js';
import menuRoutes from './routes/menu_routes.js';
import certificationRoutes from './routes/certification_routes.js';
import calendarRoutes from './routes/calendar_routes.js';
import facultyReportRoutes from './routes/faculty_report_routes.js';
import userRoutes from './routes/user_routes.js';
import admissionsRoutes from './routes/admissions_routes.js';
import pool from './config/database.js'; // Must be exported as `default` from database.js

// Setup __dirname in ESM
const __dirname = import.meta.dirname;

// Initialize app
dotenv.config();
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});


// Ensure directories exist
['exports', 'uploads'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});


// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log(path.join(__dirname, 'uploads'));


// API routes
app.use('/api/students', studentRoutes);
app.use('/api/students-list', studentsRoutes); // Consider merging
app.use('/api/achievements', achievementRoutes);
app.use('/api/achievements/export', achievementExportRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/faculty', facultyDashboardRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/reports', facultyReportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admissions', admissionsRoutes);


const frontendDistPath = path.join(import.meta.dirname,"..","/dist/frontend");
console.log(`Serving static files from: ${frontendDistPath}`);

app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});


// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


// DB connection test
pool.getConnection()
.then(connection => {
  console.log('✅ Database connection successful');
  connection.release();
})
.catch(err => {
  console.error('❌ Database connection failed:', err);
  });
  
  // Start server
  const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
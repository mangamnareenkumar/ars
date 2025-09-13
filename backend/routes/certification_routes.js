import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database.js';
import { generateDummyCertificate }from '../controllers/certificateController.js';

const __dirname = import.meta.dirname;

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'c1' + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure certifications table has the required columns
router.use(async (req, res, next) => {
  try {
    const connection = await pool.getConnection();
    try {
      // Check if certification_type column exists
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM certifications LIKE 'certification_type'
      `);
      
      // If column doesn't exist, add it
      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE certifications 
          ADD COLUMN certification_type VARCHAR(50) DEFAULT 'other' AFTER certificate_url
        `);
        console.log('Added certification_type column to certifications table');
      }
    } finally {
      connection.release();
    }
    next();
  } catch (error) {
    console.error('Error checking/updating database schema:', error);
    next(error);
  }
});

// Get all certifications
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT c.*, s.name as student_name 
        FROM certifications c
        JOIN students s ON c.registration_number = s.registration_number
        ORDER BY c.created_at DESC
      `);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ message: 'Error fetching certifications', error: error.message });
  }
});

// Add new certification
router.post('/', upload.single('certificate'), async (req, res) => {
  try {
    const {
      registration_number,
      title,
      description,
      issuing_organization,
      issue_date,
      expiry_date,
      credential_id,
      certification_type
    } = req.body;

    const connection = await pool.getConnection();
    try {
      const certificateUrl = req.file ? `/uploads/certificates/${req.file.filename}` : null;

      const [result] = await connection.query(
        `INSERT INTO certifications 
         (registration_number, title, description, issuing_organization, 
          issue_date, expiry_date, credential_id, certificate_url, certification_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [registration_number, title, description, issuing_organization,
         issue_date, expiry_date || null, credential_id, certificateUrl, certification_type]
      );

      const [newCertification] = await connection.query(
        'SELECT c.*, s.name as student_name FROM certifications c JOIN students s ON c.registration_number = s.registration_number WHERE c.id = ?',
        [result.insertId]
      );

      res.status(201).json(newCertification[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding certification:', error);
    res.status(500).json({ message: 'Error adding certification', error: error.message });
  }
});

// Update certification
router.put('/:id', upload.single('certificate'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      issuing_organization,
      issue_date,
      expiry_date,
      credential_id,
      certification_type
    } = req.body;

    const connection = await pool.getConnection();
    try {
      let certificateUrl = undefined;
      if (req.file) {
        certificateUrl = `/uploads/certificates/${req.file.filename}`;
        
        // Delete old certificate file if it exists
        const [oldCert] = await connection.query(
          'SELECT certificate_url FROM certifications WHERE id = ?',
          [id]
        );
        
        if (oldCert[0]?.certificate_url) {
          const oldPath = path.join(__dirname, '..', oldCert[0].certificate_url);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      const updateFields = [
        title,
        description,
        issuing_organization,
        issue_date,
        expiry_date || null,
        credential_id,
        certification_type
      ];

      let query = `
        UPDATE certifications 
        SET title = ?, description = ?, issuing_organization = ?,
            issue_date = ?, expiry_date = ?, credential_id = ?,
            certification_type = ?
      `;

      if (certificateUrl !== undefined) {
        query += ', certificate_url = ?';
        updateFields.push(certificateUrl);
      }

      query += ' WHERE id = ?';
      updateFields.push(id);

      await connection.query(query, updateFields);

      const [updatedCertification] = await connection.query(
        'SELECT c.*, s.name as student_name FROM certifications c JOIN students s ON c.registration_number = s.registration_number WHERE c.id = ?',
        [id]
      );

      res.json(updatedCertification[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating certification:', error);
    res.status(500).json({ message: 'Error updating certification', error: error.message });
  }
});

// Delete certification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    try {
      // Get certificate file path before deleting
      const [cert] = await connection.query(
        'SELECT certificate_url FROM certifications WHERE id = ?',
        [id]
      );
      
      // Delete the record
      await connection.query('DELETE FROM certifications WHERE id = ?', [id]);
      
      // Delete the file if it exists
      if (cert[0]?.certificate_url) {
        const filePath = path.join(__dirname, '..', cert[0].certificate_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.json({ message: 'Certification deleted successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting certification:', error);
    res.status(500).json({ message: 'Error deleting certification', error: error.message });
  }
});

// Verify certification
router.put('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    try {
      await connection.query(
        'UPDATE certifications SET verified = true WHERE id = ?',
        [id]
      );
      
      const [updatedCertification] = await connection.query(
        'SELECT c.*, s.name as student_name FROM certifications c JOIN students s ON c.registration_number = s.registration_number WHERE c.id = ?',
        [id]
      );
      
      res.json(updatedCertification[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error verifying certification:', error);
    res.status(500).json({ message: 'Error verifying certification', error: error.message });
  }
});


router.post('/generate-dummy-certificate', generateDummyCertificate);

// Upload certificate-only route (no DB, just file storage)
router.post('/upload-certificate', upload.single('certificate'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/certificates/${req.file.filename}`;
  res.status(200).json({ url: fileUrl });
});


export default router;
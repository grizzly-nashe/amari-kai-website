const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Setup (for handling file uploads in memory)
const upload = multer({ storage: multer.memoryStorage() });

// 1. API ROUTE: Handle Client Inquiries
app.post('/api/inquiries', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, service, message } = req.body;
    
    await pool.query(
      `INSERT INTO inquiries (first_name, last_name, email, phone, address, service, message, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'New') RETURNING *`,
      [firstName, lastName, email, phone, address, service, message]
    );

    console.log(`New inquiry received from ${firstName} ${lastName}`);
    res.status(201).json({ success: true, message: "Inquiry saved successfully!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. API ROUTE: Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    
    if (user.rows.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.rows[0].id, name: user.rows[0].name }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, name: user.rows[0].name });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. API ROUTE: Get all inquiries (Admin)
app.get('/api/admin/inquiries', async (req, res) => {
  try {
    const allInquiries = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(allInquiries.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. API ROUTE: Upload Project Image
app.post('/api/admin/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await cloudinary.uploader.upload(dataURI, { folder: "amarikai_projects" });
    
    await pool.query(
      'INSERT INTO projects (title, description, image_url) VALUES ($1, $2, $3)',
      [req.body.title, req.body.description, result.secure_url]
    );

    res.json({ success: true, imageUrl: result.secure_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// 5. API ROUTE: Get all projects (Public)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await pool.query('SELECT * FROM projects ORDER BY id DESC');
    res.json(projects.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 6. API ROUTE: Get all projects (Admin Dashboard)
app.get('/api/admin/projects', async (req, res) => {
  try {
    const allProjects = await pool.query('SELECT * FROM projects ORDER BY id DESC');
    res.json(allProjects.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 7. API ROUTE: Delete a project
app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await pool.query('SELECT image_url FROM projects WHERE id = $1', [id]);
    
    if (project.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Amari-Kai Backend running on http://localhost:${PORT}`);
});
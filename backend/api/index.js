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

// ---------------------------------------------------------------
// CORS - the single place where it is configured.
// Add more origins (custom domain etc.) via the ALLOWED_ORIGINS env
// variable, comma-separated, no trailing slashes.
// ---------------------------------------------------------------
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'https://amari-kai-website-mdsy.vercel.app,http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = curl / server-to-server / same-origin requests
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '100kb' }));

// ---------------------------------------------------------------
// PostgreSQL
// ---------------------------------------------------------------
const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 5,
});

// ---------------------------------------------------------------
// Cloudinary
// ---------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------------------------------------------------
// Multer (memory storage). Vercel rejects request bodies above
// ~4.5 MB, so we cap files at 4 MB to return a clear error.
// ---------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed'));
  },
});

const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        success: false,
        message: tooBig ? 'Image is too large (max 4 MB)' : err.message,
      });
    }
    next();
  });
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const STATUSES = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'];

const clean = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// https://res.cloudinary.com/<cloud>/image/upload/v123/amarikai_projects/abc.jpg
// -> amarikai_projects/abc
const publicIdFromUrl = (url) => {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url || '');
  return match ? match[1] : null;
};

// ---------------------------------------------------------------
// Email notification through Brevo (optional).
// If the BREVO_* variables are not set, this quietly does nothing.
// ---------------------------------------------------------------
const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');

const sendInquiryEmail = async (inquiry) => {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, NOTIFY_EMAIL } = process.env;
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL || !NOTIFY_EMAIL) {
    console.log('Brevo is not configured - skipping email notification');
    return;
  }

  const fullName = `${inquiry.firstName} ${inquiry.lastName}`;
  const recipients = NOTIFY_EMAIL.split(',')
    .map((e) => e.trim())
    .filter(Boolean)
    .map((email) => ({ email }));

  const rows = [
    ['Name', fullName],
    ['Email', inquiry.email],
    ['Phone', inquiry.phone],
    ['Address', inquiry.address],
    ['Service', inquiry.service],
    ['Message', inquiry.message],
  ]
    .map(([label, value]) =>
      `<tr><td style="padding:6px 12px;font-weight:bold;vertical-align:top">${label}</td>` +
      `<td style="padding:6px 12px;white-space:pre-wrap">${escapeHtml(value) || '-'}</td></tr>`
    )
    .join('');

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_SENDER_NAME || 'Amari-Kai Website', email: BREVO_SENDER_EMAIL },
        to: recipients,
        // Pressing "Reply" in your inbox answers the client directly
        replyTo: looksLikeEmail(inquiry.email) ? { email: inquiry.email, name: fullName } : undefined,
        subject: `New ${inquiry.service || 'website'} inquiry from ${fullName}`.replace(/[\r\n]+/g, ' '),
        htmlContent:
          '<h2>New inquiry from the Amari-Kai website</h2>' +
          `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows}</table>` +
          '<p style="color:#777;font-size:12px">You can also see it in the admin dashboard.</p>',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error('Brevo error:', response.status, await response.text());
    }
  } catch (err) {
    // An email problem must never stop the inquiry from being saved
    console.error('Brevo send failed:', err.message);
  }
};

// Protects admin routes: expects "Authorization: Bearer <token>"
const requireAuth = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ---------------------------------------------------------------
// Health check
// ---------------------------------------------------------------
const health = (req, res) => res.json({ success: true, message: 'Amari-Kai API is running' });
app.get('/', health);
app.get('/api', health);

// ---------------------------------------------------------------
// 1. PUBLIC: submit an inquiry
// ---------------------------------------------------------------
app.post('/api/inquiries', async (req, res) => {
  try {
    const body = req.body || {};
    const firstName = clean(body.firstName, 100);
    const lastName = clean(body.lastName, 100);
    const email = clean(body.email, 100);
    const phone = clean(body.phone, 50);
    const address = clean(body.address, 255);
    const service = clean(body.service, 100);
    const message = clean(body.message, 5000);

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ success: false, message: 'First name and last name are required' });
    }

    await pool.query(
      `INSERT INTO inquiries (first_name, last_name, email, phone, address, service, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'New')`,
      [firstName, lastName, email, phone, address, service, message]
    );

    console.log(`New inquiry received from ${firstName} ${lastName}`);
    await sendInquiryEmail({ firstName, lastName, email, phone, address, service, message });
    res.status(201).json({ success: true, message: 'Inquiry saved successfully!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 2. PUBLIC: admin login (returns a JWT)
// ---------------------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, name: user.rows[0].name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ success: true, token, name: user.rows[0].name });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 3. ADMIN: list inquiries
// ---------------------------------------------------------------
app.get('/api/admin/inquiries', requireAuth, async (req, res) => {
  try {
    const allInquiries = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(allInquiries.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 4. ADMIN: update an inquiry's status
// ---------------------------------------------------------------
app.patch('/api/admin/inquiries/:id/status', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const { status } = req.body || {};

    if (!id) return res.status(400).json({ success: false, message: 'Invalid inquiry id' });
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE inquiries SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.json({ success: true, inquiry: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 5. ADMIN: upload a project image
// ---------------------------------------------------------------
app.post('/api/admin/upload', requireAuth, uploadImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const title = clean(req.body.title, 150);
    const description = clean(req.body.description, 2000);
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, { folder: 'amarikai_projects' });

    await pool.query(
      'INSERT INTO projects (title, description, image_url) VALUES ($1, $2, $3)',
      [title, description, result.secure_url]
    );

    res.json({ success: true, imageUrl: result.secure_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ---------------------------------------------------------------
// 6. PUBLIC: list projects (home page)
// ---------------------------------------------------------------
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await pool.query('SELECT * FROM projects ORDER BY id DESC');
    res.json(projects.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 7. ADMIN: list projects (dashboard)
// ---------------------------------------------------------------
app.get('/api/admin/projects', requireAuth, async (req, res) => {
  try {
    const allProjects = await pool.query('SELECT * FROM projects ORDER BY id DESC');
    res.json(allProjects.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 8. ADMIN: delete a project (also removes the Cloudinary image)
// ---------------------------------------------------------------
app.delete('/api/admin/projects/:id', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid project id' });

    const project = await pool.query('SELECT image_url FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    // Best effort: a Cloudinary failure should not undo the delete
    const publicId = publicIdFromUrl(project.rows[0].image_url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Cloudinary delete failed:', err.message);
      }
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// 404 + error handlers
// ---------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

// Local development: `node api/index.js`. On Vercel the app is imported, not run.
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export the app for Vercel
module.exports = app;

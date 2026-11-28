require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

const createTables = async () => {
  try {
    const adminName = process.env.ADMIN_NAME || 'Amari-Kai Admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@amarikai.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || adminPassword.length < 8) {
      throw new Error('Set ADMIN_PASSWORD (at least 8 characters) in your .env before running this script.');
    }

    // Admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

    // Inquiries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(50),
        address VARCHAR(255),
        service VARCHAR(100),
        message TEXT,
        status VARCHAR(50) DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Projects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        image_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create the admin, or update its name/password if the email already exists.
    // Re-running this script with a new ADMIN_PASSWORD resets the password.
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO admins (name, email, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password;`,
      [adminName, adminEmail, hashedPassword]
    );

    console.log('Database tables ready for Amari-Kai Investments.');
    console.log(`Admin login: ${adminEmail}`);
    process.exit(0);
  } catch (err) {
    console.error('Error setting up database:', err.message);
    process.exit(1);
  }
};

createTables();

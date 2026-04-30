require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

// Initialize DB on startup
getDb().catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BLE Broadcaster SQL Backend is running.' });
});

// Register User
app.post('/api/register', async (req, res) => {
  const { fullName, email, password, institutionCode } = req.body;

  if (!fullName || !email || !password || !institutionCode) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Gmail validation
  if (!email.toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Only Gmail addresses are allowed.' });
  }

  // Password strength
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const db = await getDb();

    // Verify institution code
    const institution = await db.get('SELECT id FROM Institutions WHERE institution_code = ?', [institutionCode]);
    if (!institution) {
      return res.status(400).json({ error: 'Invalid Institution Code.' });
    }

    // Check if email exists
    const existingUser = await db.get('SELECT id FROM Users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate fixed 128-bit UUID
    const broadcastUuid = uuidv4().toUpperCase();

    // Insert user
    const result = await db.run(
      `INSERT INTO Users (name, email, password_hash, broadcast_uuid, institution_id)
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, email.toLowerCase(), passwordHash, broadcastUuid, institution.id]
    );

    res.status(201).json({
      success: true,
      uid: result.lastID.toString(),
      message: "Account created successfully. Please login."
    });
  } catch (error) {
    console.error("Error creating new user:", error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Login User
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const db = await getDb();

    // Find user
    const user = await db.get('SELECT * FROM Users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, broadcastUuid: user.broadcast_uuid },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      userData: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        broadcastUuid: user.broadcast_uuid,
        institutionId: user.institution_id
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get User Data (using JWT)
app.get('/api/getUserData', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    
    const user = await db.get('SELECT id, name, email, broadcast_uuid, institution_id FROM Users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(404).json({ error: "User data not found." });
    }

    res.json({
      success: true,
      userData: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        broadcastUuid: user.broadcast_uuid,
        institutionId: user.institution_id
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SQL Backend server running on port ${PORT}`);
});

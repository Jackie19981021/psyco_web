// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://psyco-web.netlify.app',
      'https://psycho-web.netlify.app',
      /\.netlify\.app$/,
      /\.vercel\.app$/
    ];

    if (!origin || allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    })) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in serverless for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-app-mode']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Global variables for database connection
let db = null;
let client = null;

// Database connection function
async function connectDB() {
  if (db) return db;
  
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log('⚠️  No MongoDB URI found, using memory storage');
      return null;
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('psycho-production');
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return null;
  }
}

// Initialize database connection
connectDB();

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'PSYCHO Platform API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    endpoints: {
      hello: '/api/hello',
      health: '/api/health',
      register: '/api/auth/register',
      login: '/api/auth/login',
      users: '/api/users'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'PSYCHO Platform API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, traits = [] } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    await connectDB();
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      username,
      email,
      password: hashedPassword,
      traits: Array.isArray(traits) ? traits : [],
      createdAt: new Date(),
      lastActive: new Date(),
      isOnline: false,
      profile: {
        bio: '',
        avatar: '',
        age: null,
        location: '',
        interests: []
      }
    };

    const result = await db.collection('users').insertOne(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: result.insertedId,
        username,
        email 
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Return user without password
    const userResponse = {
      id: result.insertedId,
      username,
      email,
      traits,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    await connectDB();
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          lastActive: new Date(),
          isOnline: true
        }
      }
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        email: user.email 
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Return user without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      traits: user.traits || [],
      profile: user.profile || {},
      lastActive: new Date()
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Users routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    await connectDB();
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .limit(10)
      .toArray();

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Export for Vercel
module.exports = app;
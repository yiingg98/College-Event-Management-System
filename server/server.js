/**
 * UNI Events Server
 * 
 * Express.js backend server for UNI Events platform
 * Handles user authentication, event management, admin operations, and bookings
 * 
 * @version 1.0.0
 * @author UNI Events Team
 */

// ============================================================================
// IMPORTS & CONFIGURATION
// ============================================================================

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config(); // Load environment variables


// Database imports
const { initializePool } = require('./db');
const db = require('./db-access');

const app = express();
const PORT = process.env.PORT || 4400;

// File paths
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// CORS configuration - Local development only
app.use(cors({
  origin: ['http://localhost:5500', 'http://localhost:4400', 'http://127.0.0.1:5500', 'http://127.0.0.1:4400'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// CRITICAL: Only parse JSON for non-multipart requests
// express.json() consumes the request stream, which prevents multer from reading multipart data
app.use((req, res, next) => {
  const contentType = req.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return next(); // Skip JSON parsing for multipart
  }
  express.json()(req, res, next);
});
// ================= SESSION SETUP =================
app.use(session({
  name: 'admin.sid',            // cookie name
  secret: 'super-secret-key',   // change to any string
  resave: false,
  saveUninitialized: false,     // VERY IMPORTANT
  cookie: {
    httpOnly: true,
    secure: false,              // must be false on localhost
    sameSite: 'lax',            // REQUIRED for local development
    maxAge: 1000 * 60 * 60 * 2  // 2 hours
  }
}));

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
}
ensureUploadsDir();

// Configure multer for file uploads
// Use disk storage for event images, memory storage for user ID files (BLOB)
const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(UPLOADS_DIR, 'events');
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      console.error('Error creating upload directory:', err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const memoryStorage = multer.memoryStorage();

// Upload for user registration (BLOB storage)
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

// Upload for event images (disk storage)
const uploadEventImage = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
    fieldSize: 10 * 1024 * 1024, // 10MB for fields
    fields: 30, // Max number of non-file fields
    files: 1 // Max number of files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG) are allowed'));
    }
  }
});

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================
// All data access functions are now in db-access.js
// Using database functions from db module
const readUsers = db.readUsers;
const getUserById = db.getUserById;
const getUserByEmail = db.getUserByEmail;
const createUser = db.createUser;
const updateUser = db.updateUser;
const getStudentIdFile = db.getStudentIdFile;

const readEvents = db.readEvents;
const getEventById = db.getEventById;
const createEvent = db.createEvent;
const updateEvent = db.updateEvent;
const deleteEvent = db.deleteEvent;

const readAdmins = db.readAdmins;
const getAdminByEmail = db.getAdminByEmail;

const readBookings = db.readBookings;
const createBooking = db.createBooking;

const readEventRequests = db.readEventRequests;
const getEventRequestById = db.getEventRequestById;
const createEventRequest = db.createEventRequest;
const updateEventRequest = db.updateEventRequest;
const getEventRequestsByUser = db.getEventRequestsByUser;

const readReviews = db.readReviews;
const createReview = db.createReview;
const getReviewById = db.getReviewById;

// Contact Requests
const readContactRequests = db.readContactRequests;
const createContactRequest = db.createContactRequest;
const getContactRequestById = db.getContactRequestById;
const updateContactRequest = db.updateContactRequest;

// ============================================================================
// TEST/HEALTH CHECK ROUTES
// ============================================================================

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/verify-db', async (req, res) => {
  const { getConnection, oracledb } = require('./db');
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT email, password FROM admins WHERE ROWNUM = 1`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await connection.close();

    res.json({
      message: '✅ Connected!',
      admin: result.rows[0],
      connectionString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1',
      user: process.env.DB_USER || 'unievents'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ============================================================================
// REVIEWS ROUTES
// ============================================================================

// Get all approved reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reviews = await readReviews(limit, 'approved');
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create a new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { rating, comment, userName } = req.body;

    if (!rating || !userName) {
      return res.status(400).json({ error: 'Rating and name are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get user info if logged in
    let userId = null;
    let userEmail = null;
    const userData = req.headers.authorization ? JSON.parse(Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString()) : null;

    if (userData && userData.userId) {
      userId = userData.userId;
      userEmail = userData.email;
    }

    const review = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      rating: parseInt(rating),
      comment: comment || null,
      status: 'approved', // Auto-approve for now
      createdAt: new Date()
    };

    const createdReview = await createReview(review);
    res.status(201).json(createdReview);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// ============================================================================
// CONTACT REQUESTS ROUTES
// ============================================================================

// Submit a contact request
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const contactRequest = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      subject: subject || null,
      message,
      status: 'new',
      createdAt: new Date()
    };

    const created = await createContactRequest(contactRequest);
    res.status(201).json({
      message: 'Thank you for your message! We will get back to you soon.',
      request: created
    });
  } catch (error) {
    console.error('Create contact request error:', error);
    res.status(500).json({ error: 'Failed to submit contact request' });
  }
});

// ============================================================================
// USER AUTHENTICATION ROUTES
// ============================================================================

// Register new user
app.post('/api/register', upload.single('studentIdFile'), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Student ID document is required for verification.' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      studentIdFile: req.file.buffer, // Store file buffer (BLOB) instead of file path
      studentIdFileName: req.file.originalname, // Store original filename
      studentIdFileMimeType: req.file.mimetype, // Store MIME type
      verified: false, // Default to unverified
      createdAt: new Date()
    };

    const createdUser = await createUser(newUser);

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin verification. You can log in once verified.'
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error.message.includes('file size')) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit.' });
    }
    if (error.message.includes('Only image')) {
      return res.status(400).json({ error: 'Only image files (JPEG, PNG) and PDF files are allowed.' });
    }

    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('User login attempt - Email:', email, 'Password:', password);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await getUserByEmail(email);

    console.log('User from DB:', user);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Handle Oracle's uppercase column names
    const userPassword = user.PASSWORD || user.password;

    console.log('User password from DB:', userPassword);

    // Use bcrypt to compare
    const isValid = await bcrypt.compare(password, userPassword);

    console.log('Password match:', isValid);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    res.json({
      message: 'Login successful.',
      user: {
        id: user.ID || user.id,
        name: user.NAME || user.name,
        email: user.EMAIL || user.email,
        verified: user.VERIFIED === 1 || user.verified === 1 || user.verified === true,
        createdAt: user.CREATED_AT || user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// Get student ID file for a user - MUST come before /api/user/:id
app.get('/api/user/:id/student-id', async (req, res) => {
  const userId = req.params.id;

  try {
    const fileData = await getStudentIdFile(userId);

    if (!fileData) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileData.filename}"`);
    res.send(fileData.buffer);
  } catch (error) {
    console.error('[ENDPOINT] Get student ID file error:', error);
    res.status(404).json({ error: 'Not found' });
  }
});

// Get user's event requests (by userId or email) - MUST come before /api/user/:id
// Using exact path match to ensure it's matched before the parameterized route
app.get('/api/user/event-requests', async (req, res) => {
  try {
    const { userId, email } = req.query;

    if (!userId && !email) {
      return res.status(400).json({ error: 'User ID or email is required' });
    }

    const userRequests = await getEventRequestsByUser(userId, email);

    res.json(userRequests);
  } catch (error) {
    console.error('[EVENT-REQUESTS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch event requests' });
  }
});

// ============================================================================
// REVIEWS ROUTES
// ============================================================================

// Get all approved reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reviews = await readReviews(limit, 'approved');
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create a new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { rating, comment, userName } = req.body;

    if (!rating || !userName) {
      return res.status(400).json({ error: 'Rating and name are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get user info if logged in
    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const userData = JSON.parse(Buffer.from(authHeader.split(' ')[1], 'base64').toString());
        userId = userData.userId;
        userEmail = userData.email;
      } catch (e) {
        // Not logged in, that's okay
      }
    }

    const review = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      rating: parseInt(rating),
      comment: comment || null,
      status: 'approved', // Auto-approve for now
      createdAt: new Date()
    };

    const createdReview = await createReview(review);
    res.status(201).json(createdReview);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Get current user data (public endpoint for logged-in users)
app.get('/api/user/:id', async (req, res) => {
  try {
    // Don't match if the id is "event-requests"
    if (req.params.id === 'event-requests') {
      return res.status(404).json({ error: 'Route not found' });
    }

    console.log('User endpoint hit with id:', req.params.id);
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data without password (handle Oracle uppercase column names)
    const safeUser = {
      id: user.id || user.ID,
      name: user.name || user.NAME,
      email: user.email || user.EMAIL,
      verified: (user.verified === 1 || user.VERIFIED === 1 || user.verified === true),
      studentIdFileName: user.studentIdFileName || user.STUDENT_ID_FILE_NAME,
      studentIdFileMimeType: user.studentIdFileMimeType || user.STUDENT_ID_FILE_MIME_TYPE,
      hasStudentIdFile: !!(user.studentIdFileName || user.STUDENT_ID_FILE_NAME),
      createdAt: user.createdAt || user.CREATED_AT
    };
    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============================================================================
// EVENTS ROUTES
// ============================================================================

// Get all events (with optional filtering)
app.get('/api/events', async (req, res) => {
  try {
    const events = await readEvents();
    const { category, status, search } = req.query;

    let filteredEvents = events;

    if (category) {
      filteredEvents = filteredEvents.filter(e => e.category === category);
    }

    if (status) {
      filteredEvents = filteredEvents.filter(e => e.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(e =>
        (e.title || '').toString().toLowerCase().includes(searchLower) ||
        (e.description || '').toString().toLowerCase().includes(searchLower) ||
        (e.location || '').toString().toLowerCase().includes(searchLower)
      );
    }

    res.json(filteredEvents);
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Book an event
app.post('/api/events/book', async (req, res) => {
  try {
    const { eventId, userId, userName, userEmail, isVolunteer, semester, batch, faculty, reason, paymentMethod } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ error: 'Event ID and User ID are required' });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is free or paid (handle both camelCase and uppercase)
    const isFree = (event.isFree !== false && event.isFree !== 0) ||
      (event.IS_FREE !== false && event.IS_FREE !== 0) ||
      (event.isFree === true || event.IS_FREE === true);
    if (!isFree && !isVolunteer && !paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required for paid events' });
    }

    if (isVolunteer && (!semester || !batch || !faculty || !reason)) {
      return res.status(400).json({ error: 'All volunteer fields are required' });
    }

    const booking = {
      id: Date.now().toString(),
      eventId,
      eventTitle: event.title || event.TITLE,
      userId,
      userName,
      userEmail,
      isVolunteer: isVolunteer || false,
      semester: isVolunteer ? semester : null,
      batch: isVolunteer ? batch : null,
      faculty: isVolunteer ? faculty : null,
      reason: isVolunteer ? reason : null,
      paymentMethod: !isFree && !isVolunteer ? paymentMethod : null,
      amount: !isFree && !isVolunteer ? (event.price || event.PRICE || 0) : 0,
      status: isVolunteer ? 'pending' : (isFree ? 'confirmed' : 'pending_payment'),
      createdAt: new Date()
    };

    await createBooking(booking);

    // Update event registered count (handle both camelCase and uppercase)
    const currentRegistered = event.registered || event.REGISTERED || 0;
    await updateEvent(eventId, { registered: currentRegistered + 1 });

    res.status(201).json({
      message: isVolunteer
        ? 'Volunteer application submitted successfully!'
        : (isFree ? 'Booking confirmed!' : 'Booking created. Please complete payment.'),
      booking
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to process booking' });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt - Email:', email, 'Password:', password);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await getAdminByEmail(email);

    console.log('Admin from DB:', admin);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Handle Oracle's uppercase column names
    const adminPassword = admin.PASSWORD || admin.password;

    console.log('Admin password from DB:', adminPassword);

    // Direct comparison without hashing
    const isValid = password === adminPassword;

    console.log('Password match:', isValid);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    res.json({
      message: 'Login successful.',
      admin: {
        id: admin.ID || admin.id,
        name: admin.NAME || admin.name,
        email: admin.EMAIL || admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    // In a real app, you'd verify admin session here
    const users = await readUsers();
    // Remove passwords from response (handle Oracle column names)
    const safeUsers = users.map(user => ({
      id: user.id || user.ID,
      name: user.name || user.NAME,
      email: user.email || user.EMAIL,
      verified: (user.verified === 1 || user.VERIFIED === 1 || user.verified === true),
      studentIdFile: user.studentIdFile || user.STUDENT_ID_FILE,
      createdAt: user.createdAt || user.CREATED_AT
    }));
    res.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (admin only)
app.get('/api/admin/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if file exists
    const hasFileName = !!(user.studentIdFileName || user.STUDENT_ID_FILE_NAME);
    const hasStudentIdFile = hasFileName;

    // Remove password (handle Oracle column names)
    const safeUser = {
      id: user.id || user.ID,
      name: user.name || user.NAME,
      email: user.email || user.EMAIL,
      verified: (user.verified === 1 || user.VERIFIED === 1 || user.verified === true),
      studentIdFileName: user.studentIdFileName || user.STUDENT_ID_FILE_NAME || null,
      studentIdFileMimeType: user.studentIdFileMimeType || user.STUDENT_ID_FILE_MIME_TYPE || null,
      hasStudentIdFile: hasStudentIdFile,
      createdAt: user.createdAt || user.CREATED_AT
    };
    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user verification status (admin only)
app.patch('/api/admin/users/:id/verify', async (req, res) => {
  try {
    const { verified } = req.body;
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await updateUser(req.params.id, { verified: verified === true });
    res.json({ message: `User ${verified ? 'verified' : 'unverified'} successfully` });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update event (set free/paid, status) (admin only)
app.patch('/api/admin/events/:id', async (req, res) => {
  try {
    const { isFree, price, status } = req.body;
    const event = await getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updates = {};
    if (isFree !== undefined) {
      updates.isFree = isFree === true;
    }
    if (price !== undefined) {
      updates.price = price;
    }
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['upcoming', 'ongoing', 'past', 'cancelled'];
      if (validStatuses.includes(status.toLowerCase())) {
        updates.status = status.toLowerCase();
      } else {
        return res.status(400).json({ error: 'Invalid status. Must be one of: upcoming, ongoing, past, cancelled' });
      }
    }

    const updatedEvent = await updateEvent(req.params.id, updates);
    res.json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event (admin only)
app.delete('/api/admin/events/:id', async (req, res) => {
  try {
    const event = await getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await deleteEvent(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Create new event (admin only)
app.post('/api/admin/events', uploadEventImage.single('image'), async (req, res) => {
  try {
    const { title, subtitle, description, details, category, date, time, location, venue, organizer, tags, price, isFree, capacity } = req.body;
    const imageFile = req.file;

    if (!title || !description || !category || !date || !time || !location || !organizer) {
      return res.status(400).json({ error: 'Title, description, category, date, time, location, and organizer are required' });
    }

    if (!imageFile) {
      return res.status(400).json({ error: 'Event image is required' });
    }

    // Parse date to extract month, day, year
    const eventDate = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[eventDate.getMonth()];
    const day = eventDate.getDate().toString();
    const year = eventDate.getFullYear().toString();

    const newEvent = {
      id: Date.now().toString(),
      title,
      subtitle: subtitle || '',
      description,
      details: details || '',
      category,
      month,
      day,
      year,
      date,
      time,
      location,
      venue: venue || '',
      organizer,
      image: imageFile ? `uploads/events/${imageFile.filename}` : 'assets/images/hero-event.png',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      price: isFree ? 0 : (price || 0),
      isFree: isFree !== false,
      capacity: capacity || 0,
      registered: 0,
      status: 'upcoming',
      createdAt: new Date()
    };

    const createdEvent = await createEvent(newEvent);

    res.status(201).json({ message: 'Event created successfully', event: createdEvent });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ============================================================================
// EVENT REQUESTS ROUTES
// ============================================================================

// Submit event request (public)
app.post('/api/events/request', async (req, res) => {
  try {
    const { title, subtitle, description, category, date, time, location, venue, organizer, requesterEmail, notes, userId } = req.body;

    if (!title || !description || !category || !date || !time || !location || !organizer || !requesterEmail) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const newRequest = {
      id: Date.now().toString(),
      title,
      subtitle: subtitle || '',
      description,
      category,
      date,
      time,
      location,
      venue: venue || '',
      organizer,
      requesterEmail,
      userId: userId || null, // Store userId if user is logged in
      notes: notes || '',
      status: 'pending',
      createdAt: new Date()
    };

    await createEventRequest(newRequest);

    res.status(201).json({ message: 'Event request submitted successfully. Admin will review it soon.' });
  } catch (error) {
    console.error('Submit event request error:', error);
    res.status(500).json({ error: 'Failed to submit event request' });
  }
});


// Get all event requests (admin only)
app.get('/api/admin/event-requests', async (req, res) => {
  try {
    const requests = await readEventRequests();
    res.json(requests);
  } catch (error) {
    console.error('Get event requests error:', error);
    res.status(500).json({ error: 'Failed to fetch event requests' });
  }
});

// Get all contact requests (admin only)
app.get('/api/admin/contact-requests', async (req, res) => {
  try {
    const requests = await readContactRequests();
    res.json(requests);
  } catch (error) {
    console.error('Get contact requests error:', error);
    res.status(500).json({ error: 'Failed to fetch contact requests' });
  }
});

// Update contact request status (admin only)
app.patch('/api/admin/contact-requests/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = await updateContactRequest(req.params.id, { status });
    res.json(updated);
  } catch (error) {
    console.error('Update contact request error:', error);
    res.status(500).json({ error: 'Failed to update contact request' });
  }
});

// Approve event request and create event (admin only)
// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  console.log('[MULTER] Error handler called:', !!err, err?.constructor?.name);
  if (err instanceof multer.MulterError) {
    console.error('[MULTER] Multer error:', err);
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({ error: err.message || 'File upload failed' });
  }
  next();
};

// Add timeout middleware
const timeout = (ms) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        console.error('Request timed out after', ms, 'ms');
        res.status(504).json({ error: 'Request timeout' });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    next();
  };
};

app.post('/api/admin/event-requests/:id/approve',
  timeout(30000),
  uploadEventImage.single('image'),
  handleMulterError,
  async (req, res) => {
    try {
      const { price, isFree, capacity, tags } = req.body;
      const imageFile = req.file;

      if (!imageFile) {
        return res.status(400).json({ error: 'Event image is required' });
      }

      const request = await getEventRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: 'Event request not found' });
      }

      // Parse date to extract month, day, year
      const requestDate = request.requestDate || request.REQUEST_DATE || request.date;
      const eventDate = new Date(requestDate);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[eventDate.getMonth()];
      const day = eventDate.getDate().toString();
      const year = eventDate.getFullYear().toString();

      // Create event from request
      const newEvent = {
        id: Date.now().toString(),
        title: request.title || request.TITLE,
        subtitle: request.subtitle || request.SUBTITLE || '',
        description: request.description || request.DESCRIPTION,
        details: request.notes || request.NOTES || '',
        category: request.category || request.CATEGORY,
        month,
        day,
        year,
        date: requestDate,
        time: request.requestTime || request.REQUEST_TIME || request.time,
        location: request.location || request.LOCATION,
        venue: request.venue || request.VENUE || '',
        organizer: request.organizer || request.ORGANIZER,
        image: imageFile ? `uploads/events/${imageFile.filename}` : 'assets/images/hero-event.png',
        tags: tags ? (Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [])) : [],
        price: (isFree === 'true' || isFree === true) ? 0 : (parseFloat(price) || 0),
        isFree: (isFree === 'true' || isFree === true),
        capacity: parseInt(capacity) || 0,
        registered: 0,
        status: 'upcoming',
        createdAt: new Date()
      };

      const createdEvent = await createEvent(newEvent);

      // Update request status
      await updateEventRequest(req.params.id, {
        status: 'approved',
        approvedAt: new Date(),
        eventId: newEvent.id
      });

      res.json({ message: 'Event request approved and event created', event: createdEvent });
    } catch (error) {
      console.error('Error approving event request:', error);

      // Make sure we always send a response
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Failed to approve event request' });
      }
    }
  });

// Reject event request (admin only)
app.post('/api/admin/event-requests/:id/reject', async (req, res) => {
  try {
    const request = await getEventRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Event request not found' });
    }

    await updateEventRequest(req.params.id, {
      status: 'rejected',
      rejectedAt: new Date()
    });

    res.json({ message: 'Event request rejected' });
  } catch (error) {
    console.error('Reject event request error:', error);
    res.status(500).json({ error: 'Failed to reject event request' });
  }
});

// ============================================================================
// STATIC FILE SERVING & SPA ROUTING
// ============================================================================

// Serve specific HTML pages
app.get('/events.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'events.html')));
app.get('/event-details.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'event-details.html')));
app.get('/about.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'about.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'contact.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/auth.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'auth.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'profile.html')));

// Catch-all route for SPA routing (must be last)
app.get('*', (req, res) => {
  // Don't interfere with API routes or static files
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // For other routes, serve index.html (SPA routing)
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// ============================================================================
// DATABASE INITIALIZATION & SERVER STARTUP
// ============================================================================

// Initialize database connection pool on server start
async function startServer() {
  try {
    await initializePool();
    console.log('✅ Oracle database connection pool initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.error('⚠️  Server will continue but database operations will fail');
    console.error('💡 Make sure Oracle database is running and connection details are correct in .env file');
    console.error('💡 You may need to install Oracle Instant Client: https://www.oracle.com/database/technologies/instant-client/downloads.html');
  }

  // Start the server
  app.listen(PORT, () => {
    console.log(`🚀 UNI Events server running at http://localhost:${PORT}`);
  });
}

// Start the server
startServer();


# UNI Events - University Event Management Platform

A comprehensive event management platform for universities, featuring user authentication, event booking, volunteer management, and admin panel.

## Features

### User Features
- **User Registration & Authentication** - Secure registration with student ID verification
- **Event Discovery** - Browse and filter events by category, status, and search
- **Event Booking** - Book events with volunteer option or payment
- **Profile Management** - View profile, verification status, and account details
- **Payment Integration** - Support for Nepali payment methods (eSewa, Khalti, Bank Transfer)

### Admin Features
- **Admin Panel** - Secure admin authentication and dashboard
- **User Management** - View, verify, and manage user accounts
- **Event Management** - Create, edit, and manage events (free/paid)
- **Booking Management** - View and manage event bookings

## Project Structure

```
event management/
├── public/                 # Frontend files (for Netlify deployment)
│   ├── index.html         # Landing page
│   ├── events.html        # Events listing page
│   ├── event-details.html # Event details page
│   ├── auth.html          # Login/Registration page
│   ├── admin.html         # Admin panel
│   ├── about.html         # About page
│   ├── contact.html       # Contact page
│   ├── js/                # JavaScript files
│   │   ├── script.js      # Main frontend script
│   │   ├── events.js      # Events page script
│   │   ├── event-details.js # Event details script
│   │   ├── auth.js        # Authentication script
│   │   └── admin.js       # Admin panel script
│   ├── css/               # Stylesheets
│   │   └── styles.css     # Main stylesheet
│   └── assets/            # Static assets
│       └── images/        # Image assets
│
├── server/                # Backend server (for separate hosting)
│   └── server.js          # Express.js backend server
│
├── data/                  # Data files (JSON storage)
│   ├── users.json         # User data storage
│   ├── events.json        # Event data storage
│   ├── admins.json        # Admin credentials
│   ├── bookings.json      # Booking records
│   └── uploads/           # User-uploaded files (student IDs)
│
├── package.json           # Dependencies and scripts
├── netlify.toml           # Netlify configuration
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── ADMIN_README.md       # Admin panel documentation
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:4400`

4. **Access the application**
   - Main site: `http://localhost:4400`
   - Admin panel: `http://localhost:4400/admin.html`
   - Authentication: `http://localhost:4400/auth.html`

## Deployment

See `DEPLOY.md` for complete deployment instructions.

### Quick Deploy Options:

- **Railway** - Recommended for full-stack deployment
- **Render** - Easy Node.js hosting
- **Heroku** - Traditional PaaS
- **VPS** - Full control (DigitalOcean, AWS EC2, etc.)

The application requires:
- Node.js runtime
- Oracle Database (local or cloud)
- Oracle Instant Client

### Development Mode

For auto-reload during development:
```bash
npm run dev
```
(Requires `nodemon` - install with `npm install -g nodemon`)

## API Endpoints

### User Authentication
- `POST /api/register` - Register new user (with file upload)
- `POST /api/login` - User login
- `GET /api/user/:id` - Get user data (public)

### Events
- `GET /api/events` - Get all events (with optional filtering)
- `GET /api/events/:id` - Get single event
- `POST /api/events/book` - Book an event

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id/verify` - Verify/unverify user
- `PATCH /api/admin/events/:id` - Update event (price, free/paid)

## Default Admin Credentials

- **Email:** `admin@unievents.lk`
- **Password:** `admin123`

⚠️ **Important:** Change the default password in production!

See `ADMIN_README.md` for detailed admin panel documentation.

## File Structure & Organization

### Backend (`server.js`)
- **Configuration** - Port, file paths, middleware setup
- **File Upload** - Multer configuration for student ID uploads
- **Data Access** - Functions for reading/writing JSON files
- **User Authentication Routes** - Registration, login, user data
- **Events Routes** - Event listing, details, booking
- **Admin Routes** - Admin auth, user management, event management
- **Static File Serving** - HTML pages and static assets

### Frontend Scripts
All frontend scripts follow a consistent structure:
- **Configuration** - API base URL resolution
- **State Management** - Data storage and state
- **Core Functions** - Main functionality organized by feature
- **Event Handlers** - DOM event listeners
- **Initialization** - DOM ready setup

### Stylesheet (`styles.css`)
Organized into clear sections:
- CSS Variables & Reset
- Base Elements
- Layout Components
- Buttons
- Hero Section
- Event Cards
- Profile Components
- Booking Modal & Payment
- Admin Panel Styles
- Authentication Pages
- Form Elements
- Responsive Design

## Data Storage

The application uses Oracle Database for data storage:
- `users` table - User accounts with student ID file storage (BLOB)
- `events` table - Event listings with images
- `admins` table - Admin credentials
- `bookings` table - Booking records
- `event_requests` table - User-submitted event requests
- `contact_requests` table - Contact form submissions
- `reviews` table - User reviews and testimonials
- `data/uploads/events/` - Event image uploads

## Database Setup

1. **Install Oracle Database** (or use Oracle Cloud Free Tier)
2. **Configure `.env`** file with database credentials
3. **Initialize database:**
   ```bash
   npm run init-db
   ```
4. **Verify setup:**
   ```bash
   npm run verify-db
   ```

## Features in Detail

### User Verification System
- Users must upload a student ID document during registration
- Admins can verify users through the admin panel
- Verification status is displayed in user profiles
- Unverified users can still log in but may have limited access

### Event Booking System
- **Free Events** - Direct booking confirmation
- **Paid Events** - Payment method selection required
- **Volunteer Option** - Users can apply to volunteer (waives payment)
- Volunteer applications require additional information (semester, batch, faculty, reason)

### Payment Methods
- eSewa
- Khalti
- Bank Transfer

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile and desktop
- Works with Live Server (VS Code extension) on port 5500

## Security Notes

⚠️ **This is a prototype/demo application. For production:**

1. Implement proper session management
2. Add rate limiting for API endpoints
3. Use environment variables for sensitive data
4. Implement proper authorization middleware
5. Add input validation and sanitization
6. Use HTTPS in production
7. Implement CSRF protection
8. Add proper error handling and logging

## License

This project is for educational/demonstration purposes.

## Support

For issues or questions, please refer to:
- `ADMIN_README.md` - Admin panel documentation
- Code comments in individual files
- Server console logs for debugging

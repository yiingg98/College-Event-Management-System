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
├── public/                 # Frontend files
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
├── server/                # Backend server
│   ├── server.js          # Express.js backend server
│   ├── db.js              # Database connection
│   ├── db-access.js       # Database access functions
│   ├── schema.sql         # Database schema
│   ├── init-database.js   # Database initialization script
│   └── verify-tables.js   # Database verification script
│
├── data/                  # Data storage
│   └── uploads/           # User-uploaded files (student IDs, event images)
│       └── events/        # Event images
│
├── package.json           # Dependencies and scripts
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── ADMIN_README.md       # Admin panel documentation
```

## Getting Started

### Prerequisites
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Oracle Database** (local installation)
- **Oracle Instant Client** - [Download](https://www.oracle.com/database/technologies/instant-client/downloads.html)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd "event management"
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up Oracle Database**
   - Install Oracle Database locally (Oracle XE recommended)
   - Install Oracle Instant Client
   - Start Oracle services:
     - `OracleServiceXE`
     - `OracleOraDB21Home1TNSListener`

4. **Configure environment variables**
   - Copy `.env.example` to `.env`:
     ```bash
     copy .env.example .env
     ```
   - Edit `.env` and update with your database credentials:
     ```
     DB_USER=unievents
     DB_PASSWORD=your_password
     DB_CONNECTION_STRING=localhost:1521/XEPDB1
     ORACLE_CLIENT_LIB_DIR=C:\oracle\instantclient_21_3
     ```

5. **Initialize the database**
   ```bash
   npm run init-db
   ```

6. **Verify database setup**
   ```bash
   npm run verify-db
   ```

7. **Start the server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:4400`

8. **Access the application**
   - Main site: `http://localhost:4400`
   - Admin panel: `http://localhost:4400/admin.html`
   - Authentication: `http://localhost:4400/auth.html`

### Default Admin Credentials
- **Email:** `admin@unievents.lk`
- **Password:** `admin123`

## Requirements

- Node.js (v14 or higher)
- Oracle Database (local installation)
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

⚠️ **Important:** Change the default password for security!

See `ADMIN_README.md` for detailed admin panel documentation.

## File Structure & Organization

### Backend (`server/`)
- **server.js** - Express.js server, routes, and middleware
- **db.js** - Oracle database connection and pool management
- **db-access.js** - Database query functions
- **schema.sql** - Database table definitions
- **init-database.js** - Database initialization script
- **verify-tables.js** - Database verification utility

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
- `data/uploads/events/` - Event image files (stored on disk)

## Troubleshooting

### Oracle Database Connection Issues

**Error: "ORA-12541: TNS:no listener"**
- Make sure Oracle services are running:
  - Open Services (`services.msc` on Windows)
  - Start `OracleServiceXE`
  - Start `OracleOraDB21Home1TNSListener`

**Error: "Cannot locate Oracle Client library"**
- Verify Oracle Instant Client is installed
- Check `ORACLE_CLIENT_LIB_DIR` in `.env` points to correct path
- Ensure the path contains `oci.dll` (Windows)

**Error: "Invalid username/password"**
- Verify database credentials in `.env`
- Check if user exists in Oracle database
- Default credentials: `unievents` / `password`

### Port Already in Use

If port 4400 is already in use:
- Change `PORT` in `.env` file
- Or stop the application using port 4400

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

⚠️ **This is a local development application. Security considerations:**

1. Change default admin password
2. Use environment variables for database credentials
3. Keep Oracle database secure and accessible only locally
4. Implement proper input validation
5. Add proper error handling and logging

## License

This project is for educational/demonstration purposes.

## Support

For issues or questions, please refer to:
- `ADMIN_README.md` - Admin panel documentation
- Code comments in individual files
- Server console logs for debugging

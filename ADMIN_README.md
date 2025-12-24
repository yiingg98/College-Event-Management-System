# Admin Panel Documentation

## Overview

The Admin Panel provides comprehensive management tools for the UNI Events platform. Admins can manage users, events, event requests, and contact requests through a secure web interface.

## Accessing the Admin Panel

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Navigate to:** `http://localhost:4400/admin.html`

3. **Login with admin credentials:**
   - **Email:** `admin@unievents.lk`
   - **Password:** `admin123`

⚠️ **Important:** Change the default password after first login!

## Features

### Dashboard Overview

The admin dashboard displays key statistics:
- Total Users
- Verified Users
- Pending Verification
- Total Events
- Ongoing Events
- Pending Event Requests

### User Management

#### View All Users
- See a complete list of all registered users
- View user details: name, email, verification status, registration date
- Filter and search capabilities

#### User Details
Click the "View Details" button to see:
- Full user information
- Verification status
- Student ID document (if uploaded)
- Registration date

#### Verify/Unverify Users
- **Verify:** Click the checkmark icon to verify a user
- **Unverify:** Click the X icon to unverify a user
- Verification status is updated immediately

### Event Management

#### View All Events
- See all events in the system
- View event type (Free/Paid), price, and status
- Quick access to edit or delete actions

#### Create New Event
1. Click the **"Add Event"** button
2. Fill in the required fields:
   - **Title** (required)
   - **Description** (required)
   - **Category** (required): Music, Competition, Conference, Workshop, Sports, Cultural, Other
   - **Date** (required)
   - **Time** (required)
   - **Location** (required)
   - **Organizer** (required)
   - **Event Image** (required, max 5MB, JPEG/PNG)
3. Optional fields:
   - Subtitle
   - Details
   - Venue
   - Capacity
   - Tags (comma-separated)
4. Select event type:
   - **Free Event:** No payment required
   - **Paid Event:** Requires price input
5. Click **"Create Event"**

#### Edit Event
1. Click the edit icon on any event
2. Modify:
   - Event type (Free/Paid)
   - Price (for paid events)
   - Event status: Upcoming, Ongoing, Past, Cancelled
3. Click **"Save Changes"**

#### Delete Event
1. Click the delete icon on any event
2. Confirm deletion in the modal
3. ⚠️ **Warning:** This action cannot be undone. All bookings for this event will also be deleted.

### Event Requests Management

#### View Event Requests
- See all user-submitted event requests
- View request status: Pending, Approved, Rejected
- See requester email and organizer information

#### Approve Event Request
1. Click the checkmark icon on a pending request
2. Fill in required information:
   - Event type (Free/Paid)
   - Price (if paid event)
   - Capacity (number of attendees)
   - Event image (required, max 5MB, JPEG/PNG)
   - Tags (optional)
3. Click **"Approve & Create Event"**
   - The event will be created and the request marked as approved

#### Reject Event Request
1. Click the X icon on a pending request
2. Confirm rejection in the modal
3. The request will be marked as rejected

#### View Request Details
- Click the eye icon to see full request details
- View all submitted information including notes

### Contact Requests Management

#### View Contact Requests
- See all contact form submissions
- View status: New, Read, Replied
- See name, email, subject, message preview, and date

#### View Contact Request Details
1. Click the eye icon on any contact request
2. View full message and details
3. Request is automatically marked as "Read" when viewed

#### Mark as Read
- Click the checkmark icon to manually mark a request as read
- Status updates immediately

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login

### User Management
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id/verify` - Verify/unverify user

### Event Management
- `GET /api/events` - Get all events
- `POST /api/admin/events` - Create new event
- `PATCH /api/admin/events/:id` - Update event
- `DELETE /api/admin/events/:id` - Delete event

### Event Requests
- `GET /api/admin/event-requests` - Get all event requests
- `POST /api/admin/event-requests/:id/approve` - Approve and create event
- `POST /api/admin/event-requests/:id/reject` - Reject request

### Contact Requests
- `GET /api/admin/contact-requests` - Get all contact requests
- `PATCH /api/admin/contact-requests/:id` - Update contact request status

## Session Management

- Admin sessions are stored in browser localStorage
- Sessions expire after 8 hours of inactivity
- You must log in again after session expiration
- Click "Logout" to manually end your session

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change Default Password:** Immediately change the default admin password
2. **Session Security:** Always log out when finished
3. **Access Control:** Only authorized personnel should have admin access
4. **Database Security:** Ensure Oracle database credentials are secure
5. **Local Development:** This setup is for local development only

## Troubleshooting

### Cannot Login
- Verify admin credentials exist in the database
- Check server is running on port 4400
- Check browser console for errors
- Verify database connection

### Events Not Loading
- Check database connection
- Verify events table exists
- Check server console for errors

### User Verification Not Working
- Verify database connection
- Check users table structure
- Review server logs for errors

### File Upload Issues
- Ensure uploads directory exists: `data/uploads/events/`
- Check file size (max 5MB)
- Verify file type (JPEG/PNG only)

## Support

For issues or questions:
- Check server console logs
- Review browser console for errors
- Verify database connection
- Check code comments in `public/js/admin.js` and `server/server.js`


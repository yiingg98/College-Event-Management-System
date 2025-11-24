-- ============================================================================
-- UNI Events Database Schema
-- Oracle Database Schema for UNI Events Platform
-- ============================================================================

-- Drop tables if they exist (for clean setup)
BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE event_requests CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN NULL;
END;
/

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE bookings CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN NULL;
END;
/

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE events CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN NULL;
END;
/

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE admins CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN NULL;
END;
/

BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE users CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN NULL;
END;
/

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id VARCHAR2(50) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password VARCHAR2(255) NOT NULL,
    verified NUMBER(1) DEFAULT 0 CHECK (verified IN (0, 1)),
    student_id_file BLOB, -- Changed from VARCHAR2(500) to BLOB for binary file storage
    student_id_file_name VARCHAR2(255), -- Filename of the uploaded file
    student_id_file_mime_type VARCHAR2(100), -- MIME type (e.g., 'image/jpeg', 'application/pdf')
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verified ON users(verified);

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================
CREATE TABLE admins (
    id VARCHAR2(50) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_email ON admins(email);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id VARCHAR2(50) PRIMARY KEY,
    title VARCHAR2(500) NOT NULL,
    subtitle VARCHAR2(500),
    description CLOB,
    details CLOB,
    category VARCHAR2(100),
    month VARCHAR2(10),
    day VARCHAR2(10),
    year VARCHAR2(10),
    event_date DATE,
    event_time VARCHAR2(20),
    location VARCHAR2(500),
    venue VARCHAR2(500),
    organizer VARCHAR2(255),
    image VARCHAR2(500),
    tags CLOB, -- JSON array stored as text
    price NUMBER(10, 2) DEFAULT 0,
    is_free NUMBER(1) DEFAULT 1 CHECK (is_free IN (0, 1)),
    capacity NUMBER(10) DEFAULT 0,
    registered NUMBER(10) DEFAULT 0,
    status VARCHAR2(50) DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
CREATE TABLE bookings (
    id VARCHAR2(50) PRIMARY KEY,
    event_id VARCHAR2(50) NOT NULL,
    event_title VARCHAR2(500),
    user_id VARCHAR2(50) NOT NULL,
    user_name VARCHAR2(255),
    user_email VARCHAR2(255),
    is_volunteer NUMBER(1) DEFAULT 0 CHECK (is_volunteer IN (0, 1)),
    semester VARCHAR2(50),
    batch VARCHAR2(50),
    faculty VARCHAR2(255),
    reason CLOB,
    payment_method VARCHAR2(50),
    amount NUMBER(10, 2) DEFAULT 0,
    status VARCHAR2(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================================================
-- EVENT REQUESTS TABLE
-- ============================================================================
CREATE TABLE event_requests (
    id VARCHAR2(50) PRIMARY KEY,
    title VARCHAR2(500) NOT NULL,
    subtitle VARCHAR2(500),
    description CLOB,
    category VARCHAR2(100),
    request_date DATE,
    request_time VARCHAR2(20),
    location VARCHAR2(500),
    venue VARCHAR2(500),
    organizer VARCHAR2(255),
    requester_email VARCHAR2(255) NOT NULL,
    user_id VARCHAR2(50),
    notes CLOB,
    status VARCHAR2(50) DEFAULT 'pending',
    event_id VARCHAR2(50), -- If approved and converted to event
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_request_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE INDEX idx_event_requests_user_id ON event_requests(user_id);
CREATE INDEX idx_event_requests_email ON event_requests(requester_email);
CREATE INDEX idx_event_requests_status ON event_requests(status);

-- ============================================================================
-- CONTACT REQUESTS TABLE
-- ============================================================================
CREATE TABLE contact_requests (
    id VARCHAR2(50) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    email VARCHAR2(255) NOT NULL,
    subject VARCHAR2(500),
    message CLOB NOT NULL,
    status VARCHAR2(50) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contact_requests_email ON contact_requests(email);
CREATE INDEX idx_contact_requests_status ON contact_requests(status);
CREATE INDEX idx_contact_requests_created_at ON contact_requests(created_at);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE users IS 'User accounts for the UNI Events platform';
COMMENT ON TABLE admins IS 'Administrator accounts';
COMMENT ON TABLE events IS 'Event listings';
COMMENT ON TABLE bookings IS 'Event bookings and volunteer applications';
COMMENT ON TABLE event_requests IS 'User-submitted event requests';
COMMENT ON TABLE contact_requests IS 'Contact form submissions from users';

COMMIT;


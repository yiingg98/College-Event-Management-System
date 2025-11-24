/**
 * Database Access Functions
 * 
 * Replaces JSON file operations with Oracle database queries
 * 
 * @version 1.0.0
 */

const { executeQuery, executeQueryOne } = require('./db');

/**
 * Normalize Oracle column names (uppercase) to lowercase camelCase
 * Note: CLOBs are automatically converted to strings by fetchAsString in executeQuery
 */
function normalizeRow(row) {
  if (!row) return null;
  const normalized = {};
  for (const key in row) {
    const value = row[key];
    
    // Convert Oracle uppercase to camelCase
    const camelKey = key.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    normalized[camelKey] = value;
    // Also keep original key for compatibility
    normalized[key] = value;
  }
  return normalized;
}

// ============================================================================
// USERS
// ============================================================================

async function readUsers() {
  const sql = `SELECT * FROM users ORDER BY created_at DESC`;
  const users = await executeQuery(sql);
  return users.map(row => normalizeRow(row));
}

async function getUserById(id) {
  // Use SELECT * to get all columns - Oracle will return what exists
  const sql = `SELECT * FROM users WHERE id = :id`;
  const user = await executeQueryOne(sql, { id });
  return normalizeRow(user);
}

async function getStudentIdFile(userId) {
  const { getConnection, oracledb } = require('./db');
  let connection;
  
  try {
    connection = await getConnection();
    
    // Check if new columns exist
    try {
      await connection.execute(
        `SELECT student_id_file_name FROM users WHERE ROWNUM = 1`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
    } catch (e) {
      return null; // Old schema
    }
    
    // Try using stored procedure first (if it exists)
    try {
      const procResult = await connection.execute(
        `BEGIN get_user_blob(:userId, :chunkSize, 1, :chunk, :length, :fileName, :mimeType); END;`,
        {
          userId: userId,
          chunkSize: 2000,
          chunk: { dir: oracledb.BIND_OUT, type: oracledb.BUFFER, maxSize: 2000 },
          length: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          fileName: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 255 },
          mimeType: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }
        }
      );
      
      const blobLength = procResult.outBinds.length;
      if (blobLength && blobLength > 0) {
        // Procedure exists and works - use it
        const meta = {
          fileName: procResult.outBinds.fileName,
          mimeType: procResult.outBinds.mimeType
        };
        
        const chunks = [];
        let offset = 1;
        const chunkSize = 2000;
        let totalRead = 0;
        
        while (totalRead < blobLength) {
          const bytesToRead = Math.min(chunkSize, blobLength - totalRead);
          
          const chunkResult = await connection.execute(
            `BEGIN get_user_blob(:userId, :chunkSize, :offset, :chunk, :length, :fileName, :mimeType); END;`,
            {
              userId: userId,
              chunkSize: bytesToRead,
              offset: offset,
              chunk: { dir: oracledb.BIND_OUT, type: oracledb.BUFFER, maxSize: bytesToRead },
              length: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
              fileName: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 255 },
              mimeType: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }
            }
          );
          
          const chunk = chunkResult.outBinds.chunk;
          if (!chunk || chunk.length === 0) {
            break;
          }
          
          const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(bufferChunk);
          totalRead += bufferChunk.length;
          offset += bufferChunk.length;
          
          if (bufferChunk.length < bytesToRead) {
            break;
          }
        }
        
        if (chunks.length > 0) {
          return {
            buffer: Buffer.concat(chunks),
            filename: meta.fileName || 'student-id',
            mimeType: meta.mimeType || 'application/octet-stream'
          };
        }
      }
    } catch (procError) {
      // Procedure doesn't exist or failed - use direct query
      // This is fine, continue with direct approach
    }
    
    // Direct approach: Use fetchAsBuffer - this SHOULD work!
    // Set lobPrefetchSize at connection level for better performance
    const result = await connection.execute(
      `SELECT student_id_file, student_id_file_name, student_id_file_mime_type FROM users WHERE id = :id`,
      { id: userId },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchAsBuffer: [oracledb.BLOB] // This converts BLOB to Buffer automatically
      }
    );
    
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const blobData = row.STUDENT_ID_FILE;
    
    console.log('[GET-FILE] Blob data type:', typeof blobData, 'isBuffer:', Buffer.isBuffer(blobData), 'hasLength:', blobData ? blobData.length : 0);
    
    // fetchAsBuffer should convert BLOB to Buffer automatically
    if (Buffer.isBuffer(blobData) && blobData.length > 0) {
      console.log('[GET-FILE] ✅ Success! fetchAsBuffer worked, length:', blobData.length);
      return {
        buffer: blobData,
        filename: row.STUDENT_ID_FILE_NAME || 'student-id',
        mimeType: row.STUDENT_ID_FILE_MIME_TYPE || 'application/octet-stream'
      };
    }
    
    // If it's not a buffer but has data, try to convert it
    if (blobData && blobData.length > 0) {
      try {
        const buffer = Buffer.from(blobData);
        console.log('[GET-FILE] ✅ Converted to buffer, length:', buffer.length);
        return {
          buffer: buffer,
          filename: row.STUDENT_ID_FILE_NAME || 'student-id',
          mimeType: row.STUDENT_ID_FILE_MIME_TYPE || 'application/octet-stream'
        };
      } catch (e) {
        console.log('[GET-FILE] Failed to convert:', e.message);
      }
    }
    
    console.log('[GET-FILE] ❌ fetchAsBuffer did not work, blobData:', blobData);
    return null;
    
  } catch (error) {
    if (error.message && error.message.includes('invalid identifier')) {
      return null;
    }
    console.error('❌ Error retrieving student ID file:', error.message);
    return null;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        // Ignore
      }
    }
  }
}

async function getUserByEmail(email) {
  const sql = `SELECT * FROM users WHERE LOWER(email) = LOWER(:email)`;
  const user = await executeQueryOne(sql, { email });
  return normalizeRow(user);
}

async function createUser(user) {
  const { executeQuery, getConnection, oracledb } = require('./db');
  let connection;
  
  try {
    connection = await getConnection();
    
    // Check if new BLOB columns exist
    let hasNewColumns = false;
    try {
      await connection.execute(
        `SELECT student_id_file_name FROM users WHERE ROWNUM = 1`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      hasNewColumns = true;
    } catch (e) {
      // New columns don't exist - use old schema
      hasNewColumns = false;
    }
    
    let sql, binds;
    
    if (hasNewColumns && user.studentIdFile && Buffer.isBuffer(user.studentIdFile)) {
      // New schema with BLOB
      const tempBlob = await connection.createLob(oracledb.BLOB);
      tempBlob.write(user.studentIdFile);
      await tempBlob.end();
      
      sql = `
        INSERT INTO users (id, name, email, password, verified, student_id_file, student_id_file_name, student_id_file_mime_type, created_at)
        VALUES (:id, :name, :email, :password, :verified, :studentIdFile, :studentIdFileName, :studentIdFileMimeType, :createdAt)
      `;
      
      binds = {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        password: user.password,
        verified: user.verified ? 1 : 0,
        studentIdFile: tempBlob,
        studentIdFileName: user.studentIdFileName || null,
        studentIdFileMimeType: user.studentIdFileMimeType || null,
        createdAt: user.createdAt || new Date()
      };
      
      await connection.execute(sql, binds, { autoCommit: true });
      await tempBlob.close();
    } else {
      // Old schema - store file path (VARCHAR2) or null
      // For now, we'll store a placeholder since we can't store BLOB in VARCHAR2
      // In old schema, files would be stored on disk and path saved here
      sql = `
        INSERT INTO users (id, name, email, password, verified, student_id_file, created_at)
        VALUES (:id, :name, :email, :password, :verified, :studentIdFile, :createdAt)
      `;
      
      binds = {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        password: user.password,
        verified: user.verified ? 1 : 0,
        studentIdFile: null, // Old schema - can't store BLOB, would need file path
        createdAt: user.createdAt || new Date()
      };
      
      await connection.execute(sql, binds, { autoCommit: true });
    }
    
    return getUserById(user.id);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error closing connection:', error);
      }
    }
  }
}

async function updateUser(id, updates) {
  const fields = [];
  const binds = { id };
  
  if (updates.name !== undefined) {
    fields.push('name = :name');
    binds.name = updates.name;
  }
  if (updates.email !== undefined) {
    fields.push('email = :email');
    binds.email = updates.email.toLowerCase();
  }
  if (updates.verified !== undefined) {
    fields.push('verified = :verified');
    binds.verified = updates.verified ? 1 : 0;
  }
  if (updates.studentIdFile !== undefined) {
    fields.push('student_id_file = :studentIdFile');
    binds.studentIdFile = updates.studentIdFile;
  }
  
  if (fields.length === 0) return getUserById(id);
  
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = :id`;
  await executeQuery(sql, binds);
  return getUserById(id);
}

// ============================================================================
// ADMINS
// ============================================================================

async function readAdmins() {
  const sql = `SELECT * FROM admins ORDER BY created_at DESC`;
  return await executeQuery(sql);
}

async function getAdminById(id) {
  const sql = `SELECT * FROM admins WHERE id = :id`;
  return await executeQueryOne(sql, { id });
}

async function getAdminByEmail(email) {
  const sql = `SELECT * FROM admins WHERE LOWER(email) = LOWER(:email)`;
  return await executeQueryOne(sql, { email });
}

async function createAdmin(admin) {
  const sql = `
    INSERT INTO admins (id, name, email, password, created_at)
    VALUES (:id, :name, :email, :password, :createdAt)
  `;
  await executeQuery(sql, {
    id: admin.id,
    name: admin.name,
    email: admin.email.toLowerCase(),
    password: admin.password,
    createdAt: admin.createdAt || new Date()
  });
  return getAdminById(admin.id);
}

// ============================================================================
// EVENTS
// ============================================================================

async function readEvents() {
  try {
    const sql = `SELECT * FROM events ORDER BY event_date ASC, created_at DESC`;
    const events = await executeQuery(sql);
    // Normalize and convert Oracle NUMBER(1) to boolean and parse tags JSON
    return events.map(event => {
      const normalized = normalizeRow(event);
      
      // Ensure details and description are strings (handle any remaining LOB objects)
      let details = normalized.details || normalized.DETAILS || '';
      let description = normalized.description || normalized.DESCRIPTION || '';
      
      if (details && typeof details === 'object' && details !== null) {
        if (details.toString && typeof details.toString === 'function') {
          details = details.toString();
          if (details === '[object Object]') {
            details = '';
          }
        } else {
          details = String(details);
          if (details === '[object Object]') {
            details = '';
          }
        }
      }
      details = details || '';
      
      if (description && typeof description === 'object' && description !== null) {
        if (description.toString && typeof description.toString === 'function') {
          description = description.toString();
          if (description === '[object Object]') {
            description = '';
          }
        } else {
          description = String(description);
          if (description === '[object Object]') {
            description = '';
          }
        }
      }
      description = description || '';
      
      // Parse tags JSON safely
      let tags = [];
      const tagsValue = normalized.tags || normalized.TAGS;
      if (tagsValue) {
        if (typeof tagsValue === 'string') {
          try {
            tags = JSON.parse(tagsValue);
          } catch (e) {
            console.warn('[DB] readEvents: Failed to parse tags JSON for event:', normalized.id || normalized.ID);
            tags = [];
          }
        } else if (Array.isArray(tagsValue)) {
          tags = tagsValue;
        }
      }
      
      return {
        ...normalized,
        details: details,
        description: description,
        isFree: (normalized.isFree === 1 || normalized.IS_FREE === 1),
        tags: tags
      };
    });
  } catch (error) {
    console.error('[DB] readEvents: ❌ Error:', error);
    throw error;
  }
}

async function getEventById(id) {
  try {
    console.log('[DB] getEventById: Starting...', { eventId: id });
    const sql = `SELECT * FROM events WHERE id = :id`;
    const event = await executeQueryOne(sql, { id });
    console.log('[DB] getEventById: Query executed, event found:', !!event);
    
    if (event) {
      // Normalize the row (handles CLOB conversion via fetchAsString in executeQuery)
      const normalized = normalizeRow(event);
      
      // Ensure details and description are strings (handle any remaining LOB objects)
      let details = normalized.details || normalized.DETAILS || '';
      let description = normalized.description || normalized.DESCRIPTION || '';
      
      if (details && typeof details === 'object' && details !== null) {
        if (details.toString && typeof details.toString === 'function') {
          details = details.toString();
          if (details === '[object Object]') {
            details = '';
          }
        } else {
          details = String(details);
          if (details === '[object Object]') {
            details = '';
          }
        }
      }
      details = details || '';
      
      if (description && typeof description === 'object' && description !== null) {
        if (description.toString && typeof description.toString === 'function') {
          description = description.toString();
          if (description === '[object Object]') {
            description = '';
          }
        } else {
          description = String(description);
          if (description === '[object Object]') {
            description = '';
          }
        }
      }
      description = description || '';
      
      // Handle tags - parse if string, use as-is if already array/object
      let tags = [];
      const tagsValue = normalized.tags || normalized.TAGS;
      if (tagsValue) {
        if (typeof tagsValue === 'string') {
          try {
            tags = JSON.parse(tagsValue);
          } catch (e) {
            console.warn('[DB] getEventById: Failed to parse tags JSON:', e.message);
            tags = [];
          }
        } else if (Array.isArray(tagsValue)) {
          tags = tagsValue;
        }
      }
      
      console.log('[DB] getEventById: ✅ Success!', { eventId: normalized.id || normalized.ID });
      return {
        ...normalized,
        details: details,
        description: description,
        isFree: (normalized.isFree === 1 || normalized.IS_FREE === 1),
        tags: tags
      };
    }
    console.log('[DB] getEventById: ⚠️ Event not found');
    return null;
  } catch (error) {
    console.error('[DB] getEventById: ❌ Error:', error);
    console.error('[DB] getEventById: Error stack:', error.stack);
    throw error;
  }
}

async function createEvent(event) {
  const { executeQuery, getConnection } = require('./db');
  let connection;
  
  try {
    console.log('[DB] createEvent: Starting...', { eventId: event.id, title: event.title });
    
    // Convert LOB objects to strings if they're still LOBs
    // (fetchAsString should handle this, but safety check)
    let description = event.description;
    let details = event.details;
    
    // If they're LOB objects, we need to convert them
    if (description && typeof description === 'object' && description._type) {
      console.log('[DB] createEvent: description is LOB, converting to string...');
      // LOB objects can't be used directly in INSERT - convert to string
      // Since fetchAsString should have handled this, this is a fallback
      description = description.toString() || null;
    }
    if (details && typeof details === 'object' && details._type) {
      console.log('[DB] createEvent: details is LOB, converting to string...');
      details = details.toString() || null;
    }
    
    // Ensure they're strings or null
    description = typeof description === 'string' ? description : (description || null);
    details = typeof details === 'string' ? details : (details || null);
    
    const sql = `
      INSERT INTO events (
        id, title, subtitle, description, details, category, month, day, year,
        event_date, event_time, location, venue, organizer, image, tags,
        price, is_free, capacity, registered, status, created_at
      ) VALUES (
        :id, :title, :subtitle, :description, :details, :category, :month, :day, :year,
        :eventDate, :eventTime, :location, :venue, :organizer, :image, :tags,
        :price, :isFree, :capacity, :registered, :status, :createdAt
      )
    `;
    
    const binds = {
      id: event.id,
      title: event.title,
      subtitle: event.subtitle || null,
      description: description || null,
      details: details || null,
      category: event.category,
      month: event.month || null,
      day: event.day || null,
      year: event.year || null,
      eventDate: event.date ? new Date(event.date) : null,
      eventTime: event.time || null,
      location: event.location,
      venue: event.venue || null,
      organizer: event.organizer,
      image: event.image || null,
      tags: event.tags ? JSON.stringify(event.tags) : '[]',
      price: event.price || 0,
      isFree: event.isFree !== false ? 1 : 0,
      capacity: event.capacity || 0,
      registered: event.registered || 0,
      status: event.status || 'upcoming',
      createdAt: event.createdAt || new Date()
    };
    
    console.log('[DB] createEvent: Executing INSERT...', { 
      sql: sql.substring(0, 100) + '...',
      binds: { ...binds, tags: typeof binds.tags === 'string' ? binds.tags.substring(0, 50) + '...' : binds.tags }
    });
    
    // Use direct connection with explicit commit
    connection = await getConnection();
    const insertStart = Date.now();
    
    await connection.execute(sql, binds, { 
      autoCommit: true,
      outFormat: require('oracledb').OUT_FORMAT_OBJECT
    });
    
    console.log('[DB] createEvent: INSERT completed in', Date.now() - insertStart, 'ms');
    console.log('[DB] createEvent: INSERT successful, fetching created event...');
    
    await connection.close();
    connection = null;
    
    const fetchStart = Date.now();
    const created = await getEventById(event.id);
    console.log('[DB] createEvent: Fetch completed in', Date.now() - fetchStart, 'ms');
    console.log('[DB] createEvent: ✅ Success!', { eventId: created?.id || created?.ID });
    return created;
  } catch (error) {
    console.error('[DB] createEvent: ❌ Error:', error);
    console.error('[DB] createEvent: Error code:', error.errorNum || error.code);
    console.error('[DB] createEvent: Error message:', error.message);
    console.error('[DB] createEvent: Error stack:', error.stack);
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('[DB] createEvent: Error closing connection:', closeError);
      }
    }
    throw error;
  }
}

async function updateEvent(id, updates) {
  try {
    const fields = [];
    const binds = { id };
    
    if (updates.title !== undefined) {
      fields.push('title = :title');
      binds.title = updates.title;
    }
    if (updates.price !== undefined) {
      fields.push('price = :price');
      binds.price = updates.price;
    }
    if (updates.isFree !== undefined) {
      fields.push('is_free = :isFree');
      binds.isFree = updates.isFree ? 1 : 0;
    }
    if (updates.registered !== undefined) {
      fields.push('registered = :registered');
      binds.registered = updates.registered;
    }
    if (updates.status !== undefined) {
      fields.push('status = :status');
      binds.status = updates.status;
    }
    
    if (fields.length === 0) return getEventById(id);
    
    const sql = `UPDATE events SET ${fields.join(', ')} WHERE id = :id`;
    await executeQuery(sql, binds);
    return getEventById(id);
  } catch (error) {
    console.error('[DB] updateEvent: ❌ Error:', error);
    throw error;
  }
}

async function deleteEvent(id) {
  try {
    const sql = `DELETE FROM events WHERE id = :id`;
    await executeQuery(sql, { id });
    console.log('[DB] deleteEvent: ✅ Event deleted:', id);
  } catch (error) {
    console.error('[DB] deleteEvent: ❌ Error:', error);
    throw error;
  }
}

// ============================================================================
// BOOKINGS
// ============================================================================

async function readBookings() {
  try {
    const sql = `SELECT * FROM bookings ORDER BY created_at DESC`;
    const bookings = await executeQuery(sql);
    // Normalize rows and handle boolean conversion
    return bookings.map(booking => {
      const normalized = normalizeRow(booking);
      return {
        ...normalized,
        isVolunteer: (normalized.isVolunteer === 1 || normalized.IS_VOLUNTEER === 1)
      };
    });
  } catch (error) {
    console.error('[DB] readBookings: ❌ Error:', error);
    throw error;
  }
}

async function getBookingById(id) {
  try {
    const sql = `SELECT * FROM bookings WHERE id = :id`;
    const booking = await executeQueryOne(sql, { id });
    if (booking) {
      // Normalize row (handles CLOB conversion via fetchAsString)
      const normalized = normalizeRow(booking);
      return {
        ...normalized,
        isVolunteer: (normalized.isVolunteer === 1 || normalized.IS_VOLUNTEER === 1)
      };
    }
    return null;
  } catch (error) {
    console.error('[DB] getBookingById: ❌ Error:', error);
    throw error;
  }
}

async function createBooking(booking) {
  const sql = `
    INSERT INTO bookings (
      id, event_id, event_title, user_id, user_name, user_email,
      is_volunteer, semester, batch, faculty, reason,
      payment_method, amount, status, created_at
    ) VALUES (
      :id, :eventId, :eventTitle, :userId, :userName, :userEmail,
      :isVolunteer, :semester, :batch, :faculty, :reason,
      :paymentMethod, :amount, :status, :createdAt
    )
  `;
  await executeQuery(sql, {
    id: booking.id,
    eventId: booking.eventId,
    eventTitle: booking.eventTitle,
    userId: booking.userId,
    userName: booking.userName,
    userEmail: booking.userEmail,
    isVolunteer: booking.isVolunteer ? 1 : 0,
    semester: booking.semester || null,
    batch: booking.batch || null,
    faculty: booking.faculty || null,
    reason: booking.reason || null,
    paymentMethod: booking.paymentMethod || null,
    amount: booking.amount || 0,
    status: booking.status || 'pending',
    createdAt: booking.createdAt || new Date()
  });
  return getBookingById(booking.id);
}

// ============================================================================
// EVENT REQUESTS
// ============================================================================

async function readEventRequests() {
  const sql = `SELECT * FROM event_requests ORDER BY created_at DESC`;
  const rows = await executeQuery(sql);
  // Normalize Oracle column names to camelCase
  return rows.map(row => normalizeRow(row));
}

async function getEventRequestById(id) {
  try {
    console.log('[DB] getEventRequestById: Starting...', { requestId: id });
    const sql = `SELECT * FROM event_requests WHERE id = :id`;
    // Use executeQuery with fetchAsString option explicitly
    const { getConnection, oracledb } = require('./db');
    let connection;
    
    try {
      connection = await getConnection();
      const result = await connection.execute(
        sql,
        { id },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchAsString: [oracledb.CLOB] // Explicitly convert CLOBs to strings
        }
      );
      
      const row = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      console.log('[DB] getEventRequestById: Query executed, request found:', !!row);
      
      if (row) {
        const normalized = normalizeRow(row);
        console.log('[DB] getEventRequestById: ✅ Success!', { requestId: normalized.id || normalized.ID });
        return normalized;
      }
      console.log('[DB] getEventRequestById: ⚠️ Request not found');
      return null;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  } catch (error) {
    console.error('[DB] getEventRequestById: ❌ Error:', error);
    console.error('[DB] getEventRequestById: Error stack:', error.stack);
    throw error;
  }
}

async function createEventRequest(request) {
  try {
    const sql = `
      INSERT INTO event_requests (
        id, title, subtitle, description, category, request_date, request_time,
        location, venue, organizer, requester_email, user_id, notes,
        status, created_at
      ) VALUES (
        :id, :title, :subtitle, :description, :category, :requestDate, :requestTime,
        :location, :venue, :organizer, :requesterEmail, :userId, :notes,
        :status, :createdAt
      )
    `;
    await executeQuery(sql, {
      id: request.id,
      title: request.title,
      subtitle: request.subtitle || null,
      description: request.description || null,
      category: request.category,
      requestDate: request.date ? new Date(request.date) : null,
      requestTime: request.time || null,
      location: request.location,
      venue: request.venue || null,
      organizer: request.organizer,
      requesterEmail: request.requesterEmail.toLowerCase(),
      userId: request.userId || null,
      notes: request.notes || null,
      status: request.status || 'pending',
      createdAt: request.createdAt || new Date()
    });
    return await getEventRequestById(request.id);
  } catch (error) {
    console.error('[DB] createEventRequest: ❌ Error:', error);
    throw error;
  }
}

async function updateEventRequest(id, updates) {
  try {
    console.log('[DB] updateEventRequest: Starting...', { requestId: id, updates });
    
    const fields = [];
    const binds = { id };
    
    if (updates.status !== undefined) {
      fields.push('status = :status');
      binds.status = updates.status;
    }
    if (updates.eventId !== undefined) {
      fields.push('event_id = :eventId');
      binds.eventId = updates.eventId;
    }
    if (updates.approvedAt !== undefined) {
      fields.push('approved_at = :approvedAt');
      binds.approvedAt = updates.approvedAt;
    }
    if (updates.rejectedAt !== undefined) {
      fields.push('rejected_at = :rejectedAt');
      binds.rejectedAt = updates.rejectedAt;
    }
    
    if (fields.length === 0) {
      console.log('[DB] updateEventRequest: No fields to update, returning existing request');
      return getEventRequestById(id);
    }
    
    const sql = `UPDATE event_requests SET ${fields.join(', ')} WHERE id = :id`;
    console.log('[DB] updateEventRequest: Executing UPDATE...', { sql, binds });
    await executeQuery(sql, binds);
    console.log('[DB] updateEventRequest: UPDATE successful, fetching updated request...');
    
    const updated = await getEventRequestById(id);
    console.log('[DB] updateEventRequest: ✅ Success!', { requestId: updated?.id || updated?.ID });
    return updated;
  } catch (error) {
    console.error('[DB] updateEventRequest: ❌ Error:', error);
    console.error('[DB] updateEventRequest: Error stack:', error.stack);
    throw error;
  }
}

async function getEventRequestsByUser(userId, email) {
  try {
    let sql = `SELECT * FROM event_requests WHERE `;
    const binds = {};
    const conditions = [];
    
    if (userId) {
      conditions.push('user_id = :userId');
      binds.userId = userId;
    }
    if (email) {
      conditions.push('LOWER(requester_email) = LOWER(:email)');
      binds.email = email;
    }
    
    if (conditions.length === 0) {
      return [];
    }
    
    sql += conditions.join(' OR ');
    sql += ` ORDER BY created_at DESC`;
    
    const requests = await executeQuery(sql, binds);
    // Normalize Oracle column names to camelCase and map date/time fields
    return requests.map(row => {
      const normalized = normalizeRow(row);
      // Map request_date and request_time to date and time for frontend compatibility
      if (normalized.requestDate || normalized.REQUEST_DATE || normalized.request_date) {
        normalized.date = normalized.requestDate || normalized.REQUEST_DATE || normalized.request_date;
      }
      if (normalized.requestTime || normalized.REQUEST_TIME || normalized.request_time) {
        normalized.time = normalized.requestTime || normalized.REQUEST_TIME || normalized.request_time;
      }
      return normalized;
    });
  } catch (error) {
    console.error('[DB] getEventRequestsByUser: ❌ Error:', error);
    throw error;
  }
}

// ============================================================================
// REVIEWS
// ============================================================================

async function readReviews(limit = 10, status = 'approved') {
  try {
    const sql = `SELECT * FROM reviews WHERE status = :status ORDER BY created_at DESC FETCH FIRST :limit ROWS ONLY`;
    const rows = await executeQuery(sql, { status, limit });
    return rows.map(row => normalizeRow(row));
  } catch (error) {
    console.error('[DB] readReviews: ❌ Error:', error);
    throw error;
  }
}

async function createReview(review) {
  try {
    const sql = `
      INSERT INTO reviews (id, user_id, user_name, user_email, rating, review_comment, status, created_at)
      VALUES (:id, :userId, :userName, :userEmail, :rating, :reviewComment, :status, :createdAt)
    `;
    await executeQuery(sql, {
      id: review.id,
      userId: review.userId || null,
      userName: review.userName,
      userEmail: review.userEmail || null,
      rating: review.rating,
      reviewComment: review.comment || null,
      status: review.status || 'approved',
      createdAt: review.createdAt || new Date()
    });
    return await getReviewById(review.id);
  } catch (error) {
    console.error('[DB] createReview: ❌ Error:', error);
    throw error;
  }
}

async function getReviewById(id) {
  try {
    const sql = `SELECT * FROM reviews WHERE id = :id`;
    const rows = await executeQuery(sql, { id });
    if (rows && rows.length > 0) {
      return normalizeRow(rows[0]);
    }
    return null;
  } catch (error) {
    console.error('[DB] getReviewById: ❌ Error:', error);
    throw error;
  }
}

// ============================================================================
// CONTACT REQUESTS
// ============================================================================

async function readContactRequests() {
  const { getConnection, oracledb } = require('./db');
  let connection;
  
  try {
    connection = await getConnection();
    const sql = `SELECT * FROM contact_requests ORDER BY created_at DESC`;
    
    // Use explicit fetchAsString for CLOB
    const result = await connection.execute(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchAsString: [oracledb.CLOB]
    });
    
    const requests = result.rows || [];
    
    // Process each request and read LOBs if needed (can't use map with async)
    const processedRequests = [];
    for (const row of requests) {
      const normalized = normalizeRow(row);
      
      // Ensure message is a string (should already be converted by fetchAsString)
      let message = normalized.message || normalized.MESSAGE || '';
      
      // If it's still an object (LOB), we need to read it manually
      if (message && typeof message === 'object' && message !== null) {
        // Check if it's a LOB object
        if (message._type && message._type.toString().includes('CLOB')) {
          console.log('[DB] readContactRequests: Message is still LOB, length:', message._length);
          // Try to read it using getData
          try {
            message = await message.getData();
            console.log('[DB] readContactRequests: Successfully read LOB, length:', message ? message.length : 0);
          } catch (e) {
            console.error('[DB] readContactRequests: Error reading LOB with getData:', e);
            message = '';
          }
        } else {
          // Regular object, try to convert
          message = message.toString ? message.toString() : String(message);
          if (message === '[object Object]') {
            message = '';
          }
        }
      } else if (typeof message !== 'string') {
        // Convert to string if it's not already
        message = String(message);
      }
      
      message = message || '';
      
      processedRequests.push({
        ...normalized,
        message: message
      });
    }
    
    return processedRequests;
  } catch (error) {
    console.error('[DB] readContactRequests: ❌ Error:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore
      }
    }
  }
}

async function getContactRequestById(id) {
  const { getConnection, oracledb } = require('./db');
  let connection;
  
  try {
    connection = await getConnection();
    const sql = `SELECT * FROM contact_requests WHERE id = :id`;
    
    // Use explicit fetchAsString for CLOB
    const result = await connection.execute(sql, { id }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchAsString: [oracledb.CLOB]
    });
    
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    
    const request = result.rows[0];
    const normalized = normalizeRow(request);
    
    // Ensure message is a string (should already be converted by fetchAsString)
    let message = normalized.message || normalized.MESSAGE || '';
    
    // If it's still an object (LOB), we need to read it manually
    if (message && typeof message === 'object' && message !== null) {
      // Check if it's a LOB object
      if (message._type && message._type.toString().includes('CLOB')) {
        console.log('[DB] getContactRequestById: Message is still LOB, length:', message._length);
        // Try to read it using getData
        try {
          message = await message.getData();
          console.log('[DB] getContactRequestById: Successfully read LOB, length:', message ? message.length : 0);
        } catch (e) {
          console.error('[DB] getContactRequestById: Error reading LOB with getData:', e);
          message = '';
        }
      } else {
        // Regular object, try to convert
        message = message.toString ? message.toString() : String(message);
        if (message === '[object Object]') {
          message = '';
        }
      }
    } else if (typeof message !== 'string') {
      // Convert to string if it's not already
      message = String(message);
    }
    
    message = message || '';
    
    return {
      ...normalized,
      message: message
    };
  } catch (error) {
    console.error('[DB] getContactRequestById: ❌ Error:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore
      }
    }
  }
}

async function createContactRequest(request) {
  try {
    const sql = `
      INSERT INTO contact_requests (id, name, email, subject, message, status, created_at)
      VALUES (:id, :name, :email, :subject, :message, :status, :createdAt)
    `;
    await executeQuery(sql, {
      id: request.id,
      name: request.name,
      email: request.email,
      subject: request.subject || null,
      message: request.message,
      status: request.status || 'new',
      createdAt: request.createdAt || new Date()
    });
    return await getContactRequestById(request.id);
  } catch (error) {
    console.error('[DB] createContactRequest: ❌ Error:', error);
    throw error;
  }
}

async function updateContactRequest(id, updates) {
  try {
    const fields = [];
    const binds = { id };
    
    if (updates.status !== undefined) {
      fields.push('status = :status');
      binds.status = updates.status;
    }
    
    if (fields.length === 0) {
      return await getContactRequestById(id);
    }
    
    const sql = `UPDATE contact_requests SET ${fields.join(', ')} WHERE id = :id`;
    await executeQuery(sql, binds);
    return await getContactRequestById(id);
  } catch (error) {
    console.error('[DB] updateContactRequest: ❌ Error:', error);
    throw error;
  }
}

module.exports = {
  // Users
  readUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getStudentIdFile,
  
  // Admins
  readAdmins,
  getAdminById,
  getAdminByEmail,
  createAdmin,
  
  // Events
  readEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  
  // Bookings
  readBookings,
  getBookingById,
  createBooking,
  
  // Event Requests
  readEventRequests,
  getEventRequestById,
  createEventRequest,
  updateEventRequest,
  getEventRequestsByUser,
  
  // Reviews
  readReviews,
  createReview,
  getReviewById,
  
  // Contact Requests
  readContactRequests,
  createContactRequest,
  getContactRequestById,
  updateContactRequest
};


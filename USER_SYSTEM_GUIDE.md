# Orbital User System - Setup & Usage Guide

## What's Implemented

### 1. **Backend Server (server.py)**
- Flask-based REST API running on port 3000
- SQLite database with user authentication
- Session management with secure password hashing (SHA256)
- RESTful endpoints for all user operations

### 2. **Database (orbital.db)**
- **Users Table**: Stores username, email, hashed password, creation timestamp
- **UserProfile Table**: Stores user-specific data (reading time, activity, favorites, events, chat history)

### 3. **Authentication Pages**
- **signup.html**: User registration with validation
- **login.html**: User login with session management
- **Demo Account**: username: `demo`, password: `demo123`

### 4. **Profile Integration**
- Profile page now loads user-specific data from database
- Dynamic UI updates with user's reading time, active time, and tracked items
- Logout functionality in header

---

## Installation & Setup

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

**requirements.txt includes:**
- Flask==2.3.3
- Flask-CORS==4.0.0
- Werkzeug==2.3.7

### Step 2: Start the Backend Server

```bash
python server.py
```

The server will:
- Create `orbital.db` automatically if it doesn't exist
- Initialize database tables
- Create a demo account (username: demo, password: demo123)
- Run on `http://localhost:3000`

### Step 3: Open the Application

Open `index.html` in your browser or use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Then visit http://localhost:8000
```

---

## User Workflow

### Registration (New Users)
1. Click "Sign Up" on the login page or go to `/signup.html`
2. Enter username, email, password
3. Account created with empty profile data
4. Automatically redirected to profile page

### Login
1. Go to `/login.html`
2. Enter username/email and password
3. Session stored in browser
4. Redirected to profile page
5. User data loaded from database

### Profile Page
- Displays user's reading time and active time
- Shows favorites, continue reading items, registered events
- Lists calendar events added by user
- Logout button available in header

---

## API Endpoints

### Authentication
```
POST /api/signup
  - username, email, password, confirm_password
  - Returns: user_id, success message

POST /api/login
  - username/email, password
  - Returns: user_id, username, email, success message

POST /api/logout
  - Clears session

GET /api/check-session
  - Returns: logged_in status, user info if logged in
```

### Profile
```
GET /api/profile
  - Returns: Complete user profile data (requires login)

POST /api/profile/update
  - Updates any profile field
  - Body: { reading_time, user_active_time, favorites, ... }
```

### Chat History
```
GET /api/chat-history
  - Returns: Array of chat messages

POST /api/chat-history/add
  - Adds new message to chat
  - Body: { message, role }
```

### Activity Tracking
```
POST /api/track-read
  - Track reading time
  - Body: { minutes }

POST /api/track-active
  - Track active time
  - Body: { minutes }

POST /api/favorites/add
  - Add to favorites
  - Body: { item }

POST /api/favorites/remove
  - Remove from favorites
  - Body: { item }
```

---

## Data Persistence

### How Data is Stored

1. **User Credentials**: Hashed passwords stored in database (never in plain text)
2. **User Data**: All user activity, preferences, and chat history stored in JSON format in UserProfile table
3. **Session Management**: Flask sessions maintain login state (secure session tokens)

### Data Structure Examples

**Favorites** (stored as JSON):
```json
[
  { "id": "event-1", "title": "Eclipse 2026", "color": "purple" },
  { "id": "event-2", "title": "Meteor Shower", "color": "blue" }
]
```

**Chat History** (stored as JSON):
```json
[
  { "role": "user", "content": "Tell me about Mars", "timestamp": "2026-03-27T10:30:00" },
  { "role": "assistant", "content": "Mars is...", "timestamp": "2026-03-27T10:30:15" }
]
```

---

## Integrating with Existing Pages

### For Other Pages (index.html, mission_page.html, etc.)

To add user data tracking, add this check in your pages:

```javascript
// Check if user is logged in
async function checkAuth() {
    const response = await fetch('http://localhost:3000/api/check-session', {
        credentials: 'include'
    });
    const data = await response.json();
    
    if (data.logged_in) {
        // User is logged in, can track activities
        console.log('User:', data.username);
    } else {
        // User not logged in, redirect to login
        // window.location.href = 'login.html';
    }
}
```

### Tracking User Activities

```javascript
// Track reading time
async function trackReading(minutes) {
    await fetch('http://localhost:3000/api/track-read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
    });
}

// Track active time
async function trackActive(minutes) {
    await fetch('http://localhost:3000/api/track-active', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
    });
}

// Add to favorites
async function addFavorite(item) {
    await fetch('http://localhost:3000/api/favorites/add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
    });
}
```

---

## Security Features

1. **Password Hashing**: Passwords hashed using SHA256 (consider bcrypt for production)
2. **Session Tokens**: Flask sessions use secure tokens
3. **CORS Protection**: Flask-CORS configured (adjust as needed)
4. **Data Isolation**: Each user sees only their own data

---

## Troubleshooting

### Port 3000 Already in Use
```bash
# Windows: Kill the process
taskkill /F /IM node.exe /T

# Then start server
python server.py
```

### Database Locked Error
- Close all connections to orbital.db
- Delete orbital.db and restart server to recreate

### CORS Errors
- Ensure server is running on http://localhost:3000
- Check Flask-CORS is properly configured in server.py

### Login/Session Not Working
- Check browser cookies are enabled
- Verify credentials: demo / demo123
- Clear browser cache and try again

---

## Next Steps (Optional Enhancements)

1. **Add User Profile Editing**: Allow users to change username/email
2. **Implement JWT Tokens**: Replace Flask sessions with JWT for better scalability
3. **Add Password Reset**: Email-based password recovery
4. **Export User Data**: Allow users to download their data
5. **Analytics Dashboard**: Track platform-wide user metrics
6. **Integration with Orbi Chat**: Store and retrieve Orbi conversations per user

---

## File Structure

```
orbital/
├── server.py                 # Flask backend
├── orbital.db               # SQLite database (auto-created)
├── requirements.txt         # Python dependencies
├── signup.html             # Registration page
├── login.html              # Login page
├── profile.html            # Updated with DB integration
├── index.html              # Main page (existing)
├── mission_page.html       # (existing)
└── ... (other pages)
```

---

## Support

For issues or questions:
1. Check browser console for error messages
2. Check server logs (terminal where server.py is running)
3. Verify all files are in correct location
4. Ensure port 3000 is accessible

---

**Created: March 27, 2026**
**Orbital User System v1.0**

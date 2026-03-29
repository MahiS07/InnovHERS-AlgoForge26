from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
import hashlib
import json
from datetime import datetime, timedelta
import os
from functools import wraps

app = Flask(__name__)

# Configure CORS to support credentials from localhost origins
allowed_origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5502",
    "http://127.0.0.1:5502",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

CORS(app, 
     origins=allowed_origins,
     supports_credentials=True,
     allow_headers=["Content-Type"],
     methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"])

app.secret_key = 'orbital_secret_key_2026'  # Change in production

DATABASE = 'orbital.db'

# ==================== DATABASE INITIALIZATION ====================

def init_db():
    """Initialize the SQLite database with required tables."""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # UserProfile table
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            user_id INTEGER PRIMARY KEY,
            reading_time INTEGER DEFAULT 0,
            user_active_time INTEGER DEFAULT 0,
            favorites TEXT DEFAULT '[]',
            registered_events TEXT DEFAULT '[]',
            calendar_events TEXT DEFAULT '[]',
            interests TEXT DEFAULT '[]',
            chat_history TEXT DEFAULT '[]',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create demo account if it doesn't exist
    demo_user_exists = c.execute('SELECT id FROM users WHERE username = ?', ('demo',)).fetchone()
    if not demo_user_exists:
        demo_password = hash_password('demo123')
        c.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                 ('demo', 'demo@orbital.com', demo_password))
        demo_user_id = c.lastrowid
        
        # Initialize demo profile
        c.execute('''
            INSERT INTO user_profile (user_id, favorites, registered_events, calendar_events, interests, chat_history)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (demo_user_id, '[]', '[]', '[]', '[]', '[]'))
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def check_password(password, hashed):
    """Verify password."""
    return hashlib.sha256(password.encode()).hexdigest() == hashed

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/signup', methods=['POST'])
def signup():
    """Register a new user."""
    try:
        print(f"[SIGNUP] Request received: {request.method}")
        print(f"[SIGNUP] Content-Type: {request.content_type}")
        
        data = request.json
        print(f"[SIGNUP] Request data: {data}")
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        
        # Validation
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Check if username/email exists
        c.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        if c.fetchone():
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Create user
        hashed_password = hash_password(password)
        c.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                 (username, email, hashed_password))
        conn.commit()
        
        user_id = c.lastrowid
        
        # Initialize user profile
        c.execute('''
            INSERT INTO user_profile (user_id, favorites, registered_events, calendar_events, interests, chat_history)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, '[]', '[]', '[]', '[]', '[]'))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Sign up successful!', 'user_id': user_id}), 201
    
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Login user."""
    try:
        data = request.json
        username_or_email = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username_or_email or not password:
            return jsonify({'error': 'Username/email and password required'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Find user
        c.execute('SELECT id, username, email, password FROM users WHERE username = ? OR email = ?',
                 (username_or_email, username_or_email))
        user = c.fetchone()
        
        if not user or not check_password(password, user['password']):
            conn.close()
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Set session
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['email'] = user['email']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'user_id': user['id'],
            'username': user['username']
        }), 200
    
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user."""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route('/api/check-session', methods=['GET'])
def check_session():
    """Check if user is logged in."""
    if 'user_id' in session:
        return jsonify({
            'logged_in': True,
            'user_id': session['user_id'],
            'username': session['username'],
            'email': session['email']
        }), 200
    return jsonify({'logged_in': False}), 200

# ==================== PROFILE ROUTES ====================

def require_login(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not logged in'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/profile', methods=['GET'])
@require_login
def get_profile():
    """Get user profile data."""
    try:
        user_id = session['user_id']
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT * FROM user_profile WHERE user_id = ?', (user_id,))
        profile = c.fetchone()
        conn.close()
        
        if not profile:
            return jsonify({'error': 'Profile not found'}), 404
        
        return jsonify({
            'user_id': profile['user_id'],
            'reading_time': profile['reading_time'],
            'user_active_time': profile['user_active_time'],
            'favorites': json.loads(profile['favorites']),
            'registered_events': json.loads(profile['registered_events']),
            'calendar_events': json.loads(profile['calendar_events']),
            'interests': json.loads(profile['interests']),
            'chat_history': json.loads(profile['chat_history'])
        }), 200
    
    except Exception as e:
        print(f"Get profile error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/update', methods=['POST'])
@require_login
def update_profile():
    """Update user profile data."""
    try:
        user_id = session['user_id']
        data = request.json
        
        conn = get_db()
        c = conn.cursor()
        
        # Build dynamic update query
        updates = []
        params = []
        
        if 'reading_time' in data:
            updates.append('reading_time = ?')
            params.append(data['reading_time'])
        
        if 'user_active_time' in data:
            updates.append('user_active_time = ?')
            params.append(data['user_active_time'])
        
        if 'favorites' in data:
            updates.append('favorites = ?')
            params.append(json.dumps(data['favorites']))
        
        if 'registered_events' in data:
            updates.append('registered_events = ?')
            params.append(json.dumps(data['registered_events']))
        
        if 'calendar_events' in data:
            updates.append('calendar_events = ?')
            params.append(json.dumps(data['calendar_events']))
        
        if 'interests' in data:
            updates.append('interests = ?')
            params.append(json.dumps(data['interests']))
        
        if 'chat_history' in data:
            updates.append('chat_history = ?')
            params.append(json.dumps(data['chat_history']))
        
        if not updates:
            conn.close()
            return jsonify({'error': 'No fields to update'}), 400
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(user_id)
        
        query = f"UPDATE user_profile SET {', '.join(updates)} WHERE user_id = ?"
        c.execute(query, params)
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Profile updated'}), 200
    
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== CHAT HISTORY ROUTES ====================

@app.route('/api/chat-history', methods=['GET'])
@require_login
def get_chat_history():
    """Get user's chat history with Orbi."""
    try:
        user_id = session['user_id']
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT chat_history FROM user_profile WHERE user_id = ?', (user_id,))
        result = c.fetchone()
        conn.close()
        
        chat_history = json.loads(result['chat_history']) if result else []
        return jsonify({'chat_history': chat_history}), 200
    
    except Exception as e:
        print(f"Get chat history error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat-history/add', methods=['POST'])
@require_login
def add_chat_message():
    """Add a message to user's chat history."""
    try:
        user_id = session['user_id']
        data = request.json
        message = data.get('message')
        role = data.get('role', 'user')  # 'user' or 'assistant'
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Get current chat history
        c.execute('SELECT chat_history FROM user_profile WHERE user_id = ?', (user_id,))
        result = c.fetchone()
        chat_history = json.loads(result['chat_history']) if result else []
        
        # Add new message
        chat_history.append({
            'role': role,
            'content': message,
            'timestamp': datetime.now().isoformat()
        })
        
        # Update database
        c.execute('UPDATE user_profile SET chat_history = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                 (json.dumps(chat_history), user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'chat_history': chat_history}), 200
    
    except Exception as e:
        print(f"Add chat message error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== ACTIVITY TRACKING ROUTES ====================

@app.route('/api/track-read', methods=['POST'])
@require_login
def track_read():
    """Track reading time."""
    try:
        user_id = session['user_id']
        data = request.json
        minutes = data.get('minutes', 0)
        
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT reading_time FROM user_profile WHERE user_id = ?', (user_id,))
        result = c.fetchone()
        current_time = result['reading_time'] if result else 0
        
        new_time = current_time + minutes
        c.execute('UPDATE user_profile SET reading_time = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                 (new_time, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'reading_time': new_time}), 200
    
    except Exception as e:
        print(f"Track read error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/track-active', methods=['POST'])
@require_login
def track_active():
    """Track active time."""
    try:
        user_id = session['user_id']
        data = request.json
        minutes = data.get('minutes', 0)
        
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT user_active_time FROM user_profile WHERE user_id = ?', (user_id,))
        result = c.fetchone()
        current_time = result['user_active_time'] if result else 0
        
        new_time = current_time + minutes
        c.execute('UPDATE user_profile SET user_active_time = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                 (new_time, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'user_active_time': new_time}), 200
    
    except Exception as e:
        print(f"Track active error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== UTILITY ROUTES ====================

@app.route('/api/favorites/add', methods=['POST'])
@require_login
def add_favorite():
    """Add to favorites."""
    try:
        user_id = session['user_id']
        data = request.json
        item = data.get('item')
        
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT favorites FROM user_profile WHERE user_id = ?', (user_id,))
        result = c.fetchone()
        favorites = json.loads(result['favorites']) if result else []
        
        if item not in favorites:
            favorites.append(item)
        
        c.execute('UPDATE user_profile SET favorites = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                 (json.dumps(favorites), user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'favorites': favorites}), 200
    
    except Exception as e:
        print(f"Add favorite error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/favorites/remove', methods=['POST'])
@require_login
def remove_favorite():
    """Remove from favorites."""
    try:
        user_id = session['user_id']
        data = request.json
        item = data.get('item')
        
        conn = get_db()
        c = conn.cursor()
        
        c.execute('SELECT favorites FROM user_profile WHERE user_id = ?', (user_id,))
        result = c.fetchone()
        favorites = json.loads(result['favorites']) if result else []
        
        if item in favorites:
            favorites.remove(item)
        
        c.execute('UPDATE user_profile SET favorites = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                 (json.dumps(favorites), user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'favorites': favorites}), 200
    
    except Exception as e:
        print(f"Remove favorite error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== TEST ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check."""
    return jsonify({'status': 'Server is running'}), 200

@app.route('/', methods=['GET'])
def index():
    """Serve index page."""
    return 'Orbital Server Running', 200

# ==================== START SERVER ====================

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=3000)

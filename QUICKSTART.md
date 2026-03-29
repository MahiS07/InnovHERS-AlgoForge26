# Orbital User System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Python 3.7+ installed
- Port 3000 available (for backend)
- A modern web browser

---

## Step 1: Install Dependencies (1 minute)

```bash
cd c:\Users\mahis\OneDrive\Documents\orbital
pip install -r requirements.txt
```

---

## Step 2: Start the Backend Server (30 seconds)

```bash
python server.py
```

You should see:
```
Database initialized successfully
 * Running on http://localhost:3000
```

**Keep this terminal open!**

---

## Step 3: Open the Application (30 seconds)

### Option A: Using Python Web Server
```bash
python -m http.server 8000
```
Then open: **http://localhost:8000**

### Option B: Direct File Access
1. Open [index.html](file:///c:/Users/mahis/OneDrive/Documents/orbital/index.html) in your browser
2. Navigate to any page

---

## Step 4: Test the System (2 minutes)

### Try Demo Account
1. Go to [Login Page](http://localhost:8000/login.html)
2. Username: `demo`
3. Password: `demo123`
4. Click **Log In**

### Create New Account
1. Go to [Sign Up](http://localhost:8000/signup.html)
2. Enter username, email, password
3. Click **Create Account**
4. You're now logged in!

### Explore Features
- ✅ Visit [Profile Page](http://localhost:8000/profile.html) - see your data
- ✅ Go to [Blog Page](http://localhost:8000/blog.html) - chat with Orbi (saves per user)
- ✅ Open [Blog Detail](http://localhost:8000/blog_detail.html) - read & chat
- ✅ Click **Log Out** in header to test logout

---

## 📊 What's Working

### ✅ User Management
- User registration with validation
- Secure login with password hashing
- Session management
- Logout functionality

### ✅ Profile System
- Display user-specific data
- Reading time tracking
- Active time tracking
- Favorites management
- Event registration tracking

### ✅ Chat Persistence
- Orbi chats saved per user
- Chat history loads on page reload
- Works across blog pages

### ✅ Data Isolation
- Each user sees only their data
- No data overlap between users
- Secure session management

---

## 🛠️ Useful Commands

### View All Users
```bash
python db_manager.py list
```

### Create New User
```bash
python db_manager.py add testuser test@email.com password123
```

### Reset Database (WARNING!)
```bash
python db_manager.py reset
```
*(Deletes all users and data - creates fresh database)*

### Check Database Status
```bash
python db_manager.py check
```

---

## 🔗 Important URLs

| Page | URL | Feature |
|------|-----|---------|
| Sign Up | `/signup.html` | Create account |
| Login | `/login.html` | Sign in |
| Profile | `/profile.html` | View your data |
| Blogs | `/blog.html` | Read & write blogs |
| Blog Detail | `/blog_detail.html` | Read full blog |
| Home | `/index.html` | Main page |

---

## 📝 Demo Account

**Username:** `demo`  
**Password:** `demo123`  
**Email:** `demo@orbital.com`

*(Created automatically on first server start)*

---

## ❓ Common Issues

### "Port 3000 already in use"
```bash
# Windows
taskkill /F /IM python.exe

# Then restart
python server.py
```

### "Cannot connect to localhost:3000"
- Make sure server.py is running
- Check terminal for error messages
- Try accessing http://localhost:3000 directly

### "Login not working"
- Clear browser cookies
- Refresh page (Ctrl+F5)
- Check server is running
- Try demo account credentials

### "Chat not saving"
- Make sure you're logged in (check header)
- Check browser console for errors (F12)
- Verify server is running

---

## 📚 Learn More

For detailed documentation, see:
- [USER_SYSTEM_GUIDE.md](USER_SYSTEM_GUIDE.md) - Full API reference & features
- [server.py](server.py) - Backend implementation
- [signup.html](signup.html) - Registration form
- [login.html](login.html) - Login form

---

## 🎉 You're All Set!

Your Orbital user system is now:
- ✅ Running
- ✅ Ready for testing
- ✅ Storing user data in SQLite
- ✅ Persisting chat history

**Next Steps:**
1. Create a test account
2. Explore the profile page
3. Chat with Orbi and see messages saved!
4. Try logging out and back in (chat history persists!)

---

**Happy exploring! 🚀**

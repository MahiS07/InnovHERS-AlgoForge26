#!/usr/bin/env python3
"""
Orbital User System - Database Reset & Setup Helper
Run this script to reset the database or manage it
"""

import sqlite3
import hashlib
import json
import os

DATABASE = 'orbital.db'

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def reset_database():
    """Reset the database completely"""
    if os.path.exists(DATABASE):
        os.remove(DATABASE)
        print(f"✓ Deleted {DATABASE}")
    
    # Create new database
    init_db()
    print("✓ Database reset complete!")

def init_db():
    """Initialize database"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
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
    
    # Create demo account
    demo_password = hash_password('demo123')
    try:
        c.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                 ('demo', 'demo@orbital.com', demo_password))
        demo_user_id = c.lastrowid
        
        c.execute('''
            INSERT INTO user_profile (user_id, favorites, registered_events, calendar_events, interests, chat_history)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (demo_user_id, '[]', '[]', '[]', '[]', '[]'))
        
        print(f"✓ Demo account created (username: demo, password: demo123)")
    except sqlite3.IntegrityError:
        print("✓ Demo account already exists")
    
    conn.commit()
    conn.close()

def list_users():
    """List all users in database"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute('SELECT id, username, email, created_at FROM users')
    users = c.fetchall()
    conn.close()
    
    if not users:
        print("No users found")
        return
    
    print("\n=== Users in Database ===")
    print(f"{'ID':<5} {'Username':<15} {'Email':<25} {'Created':<20}")
    print("-" * 65)
    
    for user in users:
        print(f"{user[0]:<5} {user[1]:<15} {user[2]:<25} {user[3]:<20}")
    print()

def add_user(username, email, password):
    """Add a new user"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    hashed_pwd = hash_password(password)
    
    try:
        c.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                 (username, email, hashed_pwd))
        user_id = c.lastrowid
        
        c.execute('''
            INSERT INTO user_profile (user_id, favorites, registered_events, calendar_events, interests, chat_history)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, '[]', '[]', '[]', '[]', '[]'))
        
        conn.commit()
        print(f"✓ User '{username}' created successfully")
    except sqlite3.IntegrityError as e:
        print(f"✗ Error: {e}")
    finally:
        conn.close()

def delete_user(username):
    """Delete a user"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute('SELECT id FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    
    if not user:
        print(f"✗ User '{username}' not found")
        conn.close()
        return
    
    user_id = user[0]
    c.execute('DELETE FROM user_profile WHERE user_id = ?', (user_id,))
    c.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    print(f"✓ User '{username}' deleted successfully")

def check_database():
    """Check if database exists and is valid"""
    if not os.path.exists(DATABASE):
        print(f"✗ Database '{DATABASE}' not found")
        return False
    
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = c.fetchall()
        conn.close()
        
        if tables:
            print(f"✓ Database '{DATABASE}' is valid")
            print(f"  Tables found: {', '.join([t[0] for t in tables])}")
            return True
        else:
            print(f"✗ Database '{DATABASE}' is empty")
            return False
    except Exception as e:
        print(f"✗ Error checking database: {e}")
        return False

if __name__ == '__main__':
    import sys
    
    print("=" * 50)
    print("Orbital User System - Database Manager")
    print("=" * 50)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python db_manager.py init          - Initialize database")
        print("  python db_manager.py reset         - Reset database (WARNING: deletes all data)")
        print("  python db_manager.py list          - List all users")
        print("  python db_manager.py add <user> <email> <pwd> - Add new user")
        print("  python db_manager.py delete <user> - Delete user")
        print("  python db_manager.py check         - Check database status")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'init':
        init_db()
        print("✓ Database initialized successfully!")
    
    elif command == 'reset':
        confirm = input("⚠️  This will delete ALL data. Continue? (yes/no): ")
        if confirm.lower() == 'yes':
            reset_database()
        else:
            print("Reset cancelled")
    
    elif command == 'list':
        list_users()
    
    elif command == 'add':
        if len(sys.argv) < 5:
            print("Usage: python db_manager.py add <username> <email> <password>")
            sys.exit(1)
        add_user(sys.argv[2], sys.argv[3], sys.argv[4])
    
    elif command == 'delete':
        if len(sys.argv) < 3:
            print("Usage: python db_manager.py delete <username>")
            sys.exit(1)
        confirm = input(f"Delete user '{sys.argv[2]}'? (yes/no): ")
        if confirm.lower() == 'yes':
            delete_user(sys.argv[2])
        else:
            print("Delete cancelled")
    
    elif command == 'check':
        check_database()
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

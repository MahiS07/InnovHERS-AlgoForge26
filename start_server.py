#!/usr/bin/env python
"""
Startup script that removes the database file and starts the Flask server.
This ensures a fresh database initialization on startup.
"""
import os
import sys
import time
import subprocess

DATABASE = 'orbital.db'

def clean_database():
    """Remove existing database file to force fresh initialization."""
    if os.path.exists(DATABASE):
        try:
            # Try to remove the database file
            os.remove(DATABASE)
            print(f"✓ Removed existing {DATABASE}")
        except PermissionError:
            print(f"⚠ WARNING: Could not remove {DATABASE} - it may be in use")
            print("Waiting 2 seconds before retry...")
            time.sleep(2)
            try:
                os.remove(DATABASE)
                print(f"✓ Removed {DATABASE} on second attempt")
            except Exception as e:
                print(f"✗ Failed to remove {DATABASE}: {e}")
                print("The server may use an old database schema. Attempting to continue...")
                return False
    return True

def main():
    """Main startup routine."""
    print("=" * 60)
    print("ORBITAL PROJECT - SERVER STARTUP")
    print("=" * 60)
    print()
    
    # Clean database
    print("[1/2] Cleaning up old database files...")
    clean_database()
    print()
    
    # Start server
    print("[2/2] Starting Flask server...")
    print("-" * 60)
    print()
    
    try:
        # Import and run server
        from server import app, init_db
        
        # Initialize fresh database
        print("Initializing database...")
        init_db()
        print("✓ Database initialized successfully")
        print()
        print("Starting Flask server on http://localhost:3000")
        print("Demo account: username='demo', password='demo123'")
        print("=" * 60)
        print()
        
        # Run the Flask server
        app.run(debug=True, port=3000, use_reloader=False)
    except Exception as e:
        print(f"Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

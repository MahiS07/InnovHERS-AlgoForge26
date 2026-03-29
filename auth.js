/**
 * Authentication and Authorization Module
 * Handles user session, favorites, and profile management
 */

const API_URL = 'http://localhost:3000';

const AUTH = {
    // Check if user is logged in
    isLoggedIn() {
        try {
            const userId = localStorage.getItem('user_id');
            const username = localStorage.getItem('username');
            return !!(userId && username);
        } catch (error) {
            console.error('isLoggedIn error:', error);
            return false;
        }
    },

    // Get current user
    getCurrentUser() {
        try {
            const userId = localStorage.getItem('user_id');
            const username = localStorage.getItem('username');
            return userId && username ? { user_id: userId, username } : null;
        } catch (error) {
            console.error('getCurrentUser error:', error);
            return null;
        }
    },

    // Get user favorites from database
    async getFavorites() {
        try {
            if (!this.isLoggedIn()) {
                console.log('User not logged in, returning localStorage favorites');
                return JSON.parse(localStorage.getItem('favorites') || '[]');
            }

            const response = await fetch(`${API_URL}/api/profile`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data.favorites) ? data.favorites : [];
            } else {
                console.warn('Failed to fetch favorites from API, using localStorage');
                return JSON.parse(localStorage.getItem('favorites') || '[]');
            }
        } catch (error) {
            console.error('getFavorites error:', error);
            return JSON.parse(localStorage.getItem('favorites') || '[]');
        }
    },

    // Add favorite to database
    async addFavorite(eventId, type = 'event', data = {}) {
        try {
            if (!this.isLoggedIn()) {
                console.warn('User not logged in');
                return { error: 'Not logged in' };
            }

            // Create favorite object
            const favorite = {
                id: eventId,
                type: type,
                title: data.title || 'Untitled',
                color: data.color || 'blue',
                image: data.image || '',
                date: data.date || new Date().toISOString(),
                ...data
            };

            console.log('Adding favorite to database:', favorite);

            const response = await fetch(`${API_URL}/api/favorites/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ item: favorite })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Favorite added successfully:', result);
                
                // Also update localStorage as backup
                const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                if (!favorites.find(f => f.id === eventId)) {
                    favorites.push(favorite);
                    localStorage.setItem('favorites', JSON.stringify(favorites));
                }
                
                return { success: true };
            } else {
                const error = await response.json();
                console.error('Error adding favorite:', error);
                return { error: error.error || 'Failed to add favorite' };
            }
        } catch (error) {
            console.error('addFavorite error:', error);
            
            // Fallback to localStorage
            try {
                const favorite = {
                    id: eventId,
                    type: type,
                    title: data.title || 'Untitled',
                    color: data.color || 'blue',
                    image: data.image || '',
                    ...data
                };
                const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                if (!favorites.find(f => f.id === eventId)) {
                    favorites.push(favorite);
                    localStorage.setItem('favorites', JSON.stringify(favorites));
                }
            } catch (e) {
                console.error('Fallback localStorage error:', e);
            }
            
            return { error: error.message };
        }
    },

    // Remove favorite from database
    async removeFavorite(eventId) {
        try {
            if (!this.isLoggedIn()) {
                console.warn('User not logged in');
                return { error: 'Not logged in' };
            }

            console.log('Removing favorite from database:', eventId);

            const response = await fetch(`${API_URL}/api/favorites/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ item_id: eventId })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Favorite removed successfully:', result);
                
                // Also update localStorage as backup
                const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                const filtered = favorites.filter(f => f.id !== eventId);
                localStorage.setItem('favorites', JSON.stringify(filtered));
                
                return { success: true };
            } else {
                const error = await response.json();
                console.error('Error removing favorite:', error);
                return { error: error.error || 'Failed to remove favorite' };
            }
        } catch (error) {
            console.error('removeFavorite error:', error);
            
            // Fallback to localStorage
            try {
                const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                const filtered = favorites.filter(f => f.id !== eventId);
                localStorage.setItem('favorites', JSON.stringify(filtered));
            } catch (e) {
                console.error('Fallback localStorage error:', e);
            }
            
            return { error: error.message };
        }
    },

    // Logout
    async logout() {
        try {
            const response = await fetch(`${API_URL}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                // Clear localStorage and chat UI
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) chatMessages.innerHTML = '';
                localStorage.removeItem('user_id');
                localStorage.removeItem('username');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout anyway
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) chatMessages.innerHTML = '';
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
        }
    }
};

// ==================== ACTIVITY TRACKING ====================

// Active time tracking
let lastActiveTrackTime = 0;
let activeTimeInterval = null;

async function trackActiveTime() {
    const now = Date.now();
    const timeSinceLastTrack = now - lastActiveTrackTime;
    
    // Only track if 5 minutes (300000ms) have passed since last track
    if (timeSinceLastTrack < 300000) {
        return;
    }
    
    lastActiveTrackTime = now;
    
    const user = AUTH.getCurrentUser();
    if (!user) {
        console.log('User not logged in, skipping active time tracking');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/track-active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ minutes: 5 })
        });

        if (response.ok) {
            console.log('Active time tracked successfully');
        } else {
            console.error('Failed to track active time:', response.status);
        }
    } catch (error) {
        console.error('Error tracking active time:', error);
    }
}

// Reading time tracking
let readingTimeInterval = null;

async function trackReadingTime(eventId, minutes = 2) {
    const user = AUTH.getCurrentUser();
    if (!user) {
        console.log('User not logged in, skipping reading time tracking');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/track-read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ minutes: minutes })
        });

        if (response.ok) {
            console.log(`Reading time tracked: ${minutes} minutes`);
        } else {
            console.error('Failed to track reading time:', response.status);
        }
    } catch (error) {
        console.error('Error tracking reading time:', error);
    }
}

function startTrackingReading() {
    // Clear any existing interval
    if (readingTimeInterval) {
        clearInterval(readingTimeInterval);
    }
    
    // Start new interval that tracks reading every 2 minutes
    readingTimeInterval = setInterval(() => {
        trackReadingTime(null, 2);
    }, 120000); // 2 minutes = 120000ms
    
    console.log('Started tracking reading time');
}

function stopTrackingReading() {
    if (readingTimeInterval) {
        clearInterval(readingTimeInterval);
        readingTimeInterval = null;
        console.log('Stopped tracking reading time');
    }
}

// Initialize event listeners for active time tracking
document.addEventListener('DOMContentLoaded', () => {
    // Only attach listeners once
    if (!window.activeTimeListenersInitialized) {
        document.addEventListener('mousemove', trackActiveTime);
        document.addEventListener('keypress', trackActiveTime);
        document.addEventListener('click', trackActiveTime);
        
        // Auto-track every 10 minutes
        setInterval(() => {
            trackActiveTime();
        }, 600000);
        
        window.activeTimeListenersInitialized = true;
        console.log('Active time tracking listeners initialized');
    }
});

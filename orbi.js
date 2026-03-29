/**
 * ═══════════════════════════════════════════════════════════════
 * ORBI - Space-Only AI Assistant Module
 * ═══════════════════════════════════════════════════════════════
 * Single-source-of-truth for all ORBI functionality
 * - Chat interface & Groq AI integration
 * - User memory & chat history persistence
 * - Page context awareness
 * - Strict space-only domain enforcement
 */

const ORBI = {
    // ======================== CONFIGURATION ========================
    GROQ_API_KEY: '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',
    GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
    API_URL: 'http://localhost:3000',
    
    // ======================== STATE ========================
    isChatOpen: false,
    chatHistory: [],
    initializeChatHistory: false,
    currentPage: null,
    userMemory: {
        name: null,
        interests: [],
        pagesVisited: [],
        questionsAsked: []
    },

    // ======================== PAGE DETECTION ========================
    detectCurrentPage() {
        const pathname = window.location.pathname;
        const filename = pathname.split('/').pop() || 'index.html';
        
        const pageMap = {
            'index.html': 'Home - ISS Tracking & Cosmic Events',
            'mission_page.html': 'Missions - Space Missions Overview',
            'detailed.html': 'Missions - Detailed Mission Info',
            'blog.html': 'Blogs - Space Articles',
            'blog_detail.html': 'Blog - Detailed Article',
            'cosmic_page.html': 'Cosmic - Space Weather & Aurora',
            'learn.html': 'Learn - Satellite Disaster Detection',
            'disaster.html': 'Disaster Detection Education',
            'details.html': 'Event Details - Cosmic Event Info',
            'profile.html': 'Profile - User Dashboard'
        };
        
        this.currentPage = pageMap[filename] || 'Orbital - Space Platform';
        return this.currentPage;
    },

    // ======================== SYSTEM PROMPT ========================
    getSystemPrompt() {
        const currentPage = this.detectCurrentPage();
        return `You are Orbi, a space-only AI assistant for the Orbital website.

CURRENT PAGE: ${currentPage}

✅ ALLOWED TOPICS ONLY:
- Space, astronomy, planets, stars, galaxies, cosmic events
- Space missions, satellites, rockets, spacecraft, space exploration
- ISS tracking, astronauts, space stations
- Solar system, moon, sun, space weather
- Telescopes, space technology, orbital mechanics
- Satellite disaster detection (floods, wildfires, earthquakes from space)
- Geomagnetic storms, auroras, solar wind
- Eclipses, meteor showers, comets, asteroids
- Space history, NASA, ISRO, space agencies

❌ STRICTLY FORBIDDEN:
- General knowledge, trivia unrelated to space
- Mathematics, coding, programming (unless space-related)
- Cooking, recipes, food, sports, entertainment
- Politics, current events (unless space-related)
- History (unless space history)
- General science not related to space
- ANY other non-space topics

🌐 WEBSITE NAVIGATION GUIDANCE:
If user asks about website features, respond HELPFULLY with internal navigation:
- "Tonight's Sky" / "Sky Events" / "ISS" → "Check out the 'Tonight's Sky' section on the home page!"
- "Space Missions" / "Missions" → "Visit our Missions page to track every launch and mission!"
- "Learning" / "Learn Space" → "Head to the Learn section to understand satellite disaster detection!"
- "Blogs" / "Articles" → "Check out the Blogs page for in-depth space articles!"
- "Cosmic Data" / "Space Weather" → "Explore cosmic data on the Cosmic page!"
- "Profile" / "Account" → "Visit your Profile page to see your space journey!"

🚀 PAGE AWARENESS:
When relevant to current page (${currentPage}), reference visible content and help explain it.

🚫 OFF-TOPIC RESPONSE:
If question is not about space or website features, respond EXACTLY:
"I can only assist with space-related topics 🌌. Try asking me about planets, stars, galaxies, or space missions!"

Keep responses concise (2-3 sentences) unless detail requested.`;
    },

    // ======================== INITIALIZATION ========================
    async init() {
        this.detectCurrentPage();
        this.initSystemPrompt();
        this.loadUserMemory();
        this.setupEventListeners();
        await this.loadChatHistory();
    },

    initSystemPrompt() {
        this.chatHistory = [
            {
                role: 'system',
                content: this.getSystemPrompt()
            }
        ];
    },

    // ======================== USER MEMORY ========================
    loadUserMemory() {
        try {
            const user = AUTH?.getCurrentUser?.();
            if (user) {
                this.userMemory.name = user.username;
            }
            
            const stored = sessionStorage.getItem('orbiMemory');
            if (stored) {
                this.userMemory = { ...this.userMemory, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Error loading user memory:', e);
        }
    },

    saveUserMemory() {
        try {
            sessionStorage.setItem('orbiMemory', JSON.stringify(this.userMemory));
        } catch (e) {
            console.error('Error saving user memory:', e);
        }
    },

    // ======================== CHAT HISTORY PERSISTENCE ========================
    async loadChatHistory() {
        if (this.initializeChatHistory) return;
        this.initializeChatHistory = true;

        const userId = localStorage.getItem('user_id');
        let historyLoaded = false;

        // Try loading from database first (if user is logged in)
        if (userId) {
            try {
                const response = await fetch(`${this.API_URL}/api/chat-history`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.chat_history && data.chat_history.length > 0) {
                        const chatMessages = document.getElementById('chatMessages');
                        if (chatMessages) {
                            chatMessages.innerHTML = '';
                        }

                        const systemMsg = this.chatHistory.find(m => m.role === 'system');
                        this.chatHistory = systemMsg ? [systemMsg] : [];

                        data.chat_history.forEach(msg => {
                            if (msg.role === 'user') {
                                this.addUserMessage(msg.content);
                            } else {
                                this.addBotMessage(msg.content);
                            }
                            this.chatHistory.push({ role: msg.role, content: msg.content });
                        });
                        historyLoaded = true;
                    }
                }
            } catch (error) {
                console.warn('Database chat load failed, trying localStorage:', error);
            }
        }

        // Fallback to localStorage if database didn't load anything
        if (!historyLoaded) {
            try {
                const storageKey = userId ? `orbi_chat_${userId}` : 'orbi_chat_guest';
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const history = JSON.parse(saved);
                    if (Array.isArray(history) && history.length > 0) {
                        const chatMessages = document.getElementById('chatMessages');
                        if (chatMessages) {
                            chatMessages.innerHTML = '';
                            
                            const systemMsg = this.chatHistory.find(m => m.role === 'system');
                            this.chatHistory = systemMsg ? [systemMsg] : [];

                            history.forEach(msg => {
                                if (msg.role === 'user') {
                                    this.addUserMessage(msg.content);
                                } else if (msg.role === 'assistant') {
                                    this.addBotMessage(msg.content);
                                }
                            });
                            
                            this.chatHistory.push(...history.filter(m => m.role !== 'system'));
                        }
                    }
                }
            } catch (error) {
                console.warn('localStorage chat load failed:', error);
            }
        }
    },

    // ======================== CHAT UI ========================
    toggleChat() {
        const chatOverlay = document.getElementById('chatOverlay');
        if (!chatOverlay) return;
        
        this.isChatOpen = !this.isChatOpen;
        
        if (this.isChatOpen) {
            chatOverlay.classList.remove('hidden');
            setTimeout(() => {
                try { if (window.lucide) { lucide.createIcons(); } } catch (e) {}
            }, 10);
        } else {
            chatOverlay.classList.add('hidden');
        }
    },

    addUserMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start gap-3 mb-2 justify-end';
        messageDiv.innerHTML = `
            <div class="flex-1 bg-gradient-to-br from-white/25 to-white/15 backdrop-blur-md rounded-2xl rounded-tr-sm p-4 border border-white/30 shadow-lg">
                <p class="text-sm font-inter text-white leading-relaxed">${this.escapeHtml(message)}</p>
            </div>
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden border-2 border-white/30">
                <img src="./codeathon-figma/profile_pic.png" alt="User" class="w-full h-full object-cover">
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        this.scrollChatToBottom();
    },

    addBotMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start gap-3 mb-2';
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                <img src="./codeathon-figma/orbi.jpg" alt="Orbi" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-md rounded-2xl rounded-tl-sm p-4 border border-purple-400/30 shadow-lg">
                <p class="text-sm font-inter text-white leading-relaxed">${this.escapeHtml(message)}</p>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        this.scrollChatToBottom();
    },

    addTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return null;

        const typingDiv = document.createElement('div');
        const typingId = 'typing-' + Date.now();
        typingDiv.id = typingId;
        typingDiv.className = 'flex items-start gap-3 mb-2';
        typingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                <img src="./codeathon-figma/orbi.jpg" alt="Orbi" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-md rounded-2xl rounded-tl-sm p-4 border border-purple-400/30 shadow-lg">
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-white/60 rounded-full animate-pulse" style="animation-delay: 0s"></div>
                    <div class="w-2 h-2 bg-white/60 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                    <div class="w-2 h-2 bg-white/60 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        this.scrollChatToBottom();
        return typingId;
    },

    removeTypingIndicator(typingId) {
        if (!typingId) return;
        const typingDiv = document.getElementById(typingId);
        if (typingDiv) {
            typingDiv.remove();
        }
    },

    scrollChatToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ======================== MESSAGE HANDLING ========================
    async sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        this.addUserMessage(message);
        this.chatHistory.push({ role: 'user', content: message });

        // Track user interest
        this.userMemory.questionsAsked.push(message);
        this.saveUserMemory();

        // Save to database
        const userId = localStorage.getItem('user_id');
        if (userId) {
            try {
                await fetch(`${this.API_URL}/api/chat-history/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ message: message, role: 'user' })
                });
            } catch (e) {
                console.error('Error saving chat message:', e);
            }
        }

        // Also save to localStorage for persistence
        this.saveToLocalStorage();

        const typingId = this.addTypingIndicator();

        try {
            const response = await this.getChatResponse(message);
            this.removeTypingIndicator(typingId);
            this.addBotMessage(response);
            this.chatHistory.push({ role: 'assistant', content: response });

            // Save response to database
            if (userId) {
                try {
                    await fetch(`${this.API_URL}/api/chat-history/add`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ message: response, role: 'assistant' })
                    });
                } catch (e) {
                    console.error('Error saving chat response:', e);
                }
            }

            // Also save to localStorage for persistence
            this.saveToLocalStorage();
        } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator(typingId);
            this.addBotMessage("I'm having trouble connecting right now. Please try again in a moment.");
        }
    },

    saveToLocalStorage() {
        try {
            const userId = localStorage.getItem('user_id');
            const storageKey = userId ? `orbi_chat_${userId}` : 'orbi_chat_guest';
            const nonSystemMessages = this.chatHistory.filter(m => m.role !== 'system');
            localStorage.setItem(storageKey, JSON.stringify(nonSystemMessages));
        } catch (e) {
            console.warn('Could not save chat to localStorage:', e);
        }
    },

    async getChatResponse(userMessage) {
        const response = await fetch(this.GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: this.chatHistory,
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    // ======================== EVENT LISTENERS ========================
    setupEventListeners() {
        // Chat overlay click handler
        const chatOverlay = document.getElementById('chatOverlay');
        if (chatOverlay) {
            chatOverlay.addEventListener('click', (e) => {
                if (e.target === chatOverlay) {
                    this.toggleChat();
                }
            });
        }

        // Chat input key press
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// Expose ORBI globally
// ═══════════════════════════════════════════════════════════════
window.ORBI = ORBI;

// ═══════════════════════════════════════════════════════════════
// Global Function Wrappers (for HTML onclick handlers)
// ═══════════════════════════════════════════════════════════════

// Global toggleChat wrapper
function toggleChat() {
    if (window.ORBI) {
        ORBI.toggleChat();
    }
}

// Global sendMessage wrapper
function sendMessage() {
    if (window.ORBI) {
        ORBI.sendMessage();
    }
}

// Global handleChatKeyPress wrapper
function handleChatKeyPress(event) {
    if (window.ORBI && event.key === 'Enter') {
        ORBI.sendMessage();
    }
}

// ═══════════════════════════════════════════════════════════════
// Initialize ORBI when DOM is ready
// ═══════════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ORBI.init();
    });
} else {
    ORBI.init();
}

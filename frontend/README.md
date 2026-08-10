Smart Expense Tracker AI — Frontend

A complete, responsive SaaS-style frontend for Smart Expense Tracker AI, built with HTML5, CSS3, and vanilla ES6+ JavaScript — no frontend framework.

Key Features
Dashboard Overview 
Expense Management
Income Management 
Budget Management 
Financial Analytics 
AI Insights & AI Assistant
Notifications & Preferences
Theme Engine

Technology Stack

Core: HTML5, Vanilla JavaScript (ES6+)
Styling: CSS3 with custom properties, Flexbox, Grid, glassmorphism accents, keyframe animations
Icons: FontAwesome 6 (CDN)
Typography: Google Fonts (Plus Jakarta Sans & Inter)
Charts: Custom HTML5 Canvas & SVG engine
Dependencies: No React, Angular, Vue, Bootstrap, jQuery, or Tailwind
Directory & File Structure
frontend/
├── index.html              # Main entry point & session router
├── login.html               # Login page
├── signup.html               # Registration page
├── forgot-password.html      # Password reset page
├── dashboard.html             # Overview dashboard & metrics grid
├── expenses.html               # Expense management (CRUD, search, filter, pagination)
├── income.html                  # Income sources & history table
├── budgets.html                  # Category budget allocations & progress bars
├── analytics.html                 # Analytics & custom charts
├── ai-insights.html                # AI insights & advisory summary
├── chat.html                        # AI financial assistant workspace
├── notifications.html                # Notification feed
├── profile.html                       # User profile & currency settings
├── settings.html                       # App & security preferences
├── start_server.py                      # Local dev server (auto-opens browser)
├── package.json                          # npm script config
└── assets/
    ├── css/
    │   ├── variables.css    # Design tokens, light/dark theme values
    │   ├── main.css          # Reset, layout, sidebar, header
    │   ├── components.css     # Cards, tables, modals, inputs, buttons
    │   └── pages.css            # Chat UI, analytics canvas, AI hero banner
    └── js/
        ├── utils.js          # Currency formatting, toasts, storage helpers
        ├── api.js             # Central API service layer — talks to the backend
        ├── auth.js             # Auth handling & route guard
        ├── app.js               # Sidebar controller & theme switcher
        ├── dashboard.js           # Dashboard view controller
        ├── expenses.js             # Expenses CRUD/search/filter/pagination
        ├── income.js                 # Income CRUD
        ├── budgets.js                  # Budget progress & allocation updates
        ├── analytics.js                  # Canvas chart rendering engine
        ├── ai.js                           # AI insights & recommendation cards
        ├── chat.js                          # AI chat controller
        ├── notifications.js                  # Notification feed & filters
        ├── profile.js                          # Profile form handling
        └── settings.js                          # Settings & theme radios
How to Run

The frontend expects the backend API to be running (see ../backend/README.md) — it will not function correctly without it, since data is fetched live via REST.

Method 1: Python (recommended)
bash
cd frontend
py start_server.py
Method 2: Node.js / npm
bash
cd frontend
npm start
Method 3: Direct browser launch
Open frontend/index.html or frontend/login.html directly in a modern browser. 

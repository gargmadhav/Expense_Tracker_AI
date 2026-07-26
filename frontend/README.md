<img width="1891" height="1027" alt="{4E7593A1-48AB-477E-BAFB-A30782D3DF4E}" src="https://github.com/user-attachments/assets/4d9f2edd-ae04-4bc5-b1b9-811038b81dc3" />



# Smart Expense Tracker AI - Frontend Application

A complete, modern, responsive frontend SaaS application for **Smart Expense Tracker AI** built using **HTML5, CSS3, and ES6+ Vanilla JavaScript**.

---

## 🌟 Key Features

- **Dashboard Overview**:
  - Real-time financial metrics: Total Income, Total Expenses, Total Savings, Remaining Budget.
  - Recent transactions table and category budget status widgets.
- **Expense Management**:
  - Full CRUD capabilities (Add, Edit, Delete modals).
  - Dynamic live search keyword filter.
  - Category filtering (Housing, Groceries, Food & Dining, Transportation, Utilities, Subscriptions, Healthcare, Shopping).
  - Multi-criteria sorting (Date Newest/Oldest, Amount High/Low).
  - Responsive pagination.
- **Income Management**:
  - Income sources history table and total monthly revenue tracker.
  - Add & Delete income modals.
- **Budget Management**:
  - Monthly category budget caps configuration.
  - Visual progress percentage bars with color-coded threshold alerts (Green < 75%, Amber 75-90%, Red > 90%).
- **Financial Analytics & Custom Charts**:
  - Lightweight custom HTML5 Canvas & SVG graphics engine rendering:
    - **Monthly Spending Trends** (Line Chart)
    - **Category Spending Analysis** (Donut / Pie Chart)
    - **Income vs. Expense Comparison** (Bar Chart)
    - **Savings Growth & Accumulation** (Area Chart)
- **AI Insights & AI Assistant Workspace**:
  - AI Financial Health Score (0-100).
  - Smart spending recommendations and active risk alerts.
  - Interactive AI Chat Assistant workspace with simulated streaming typing indicator and quick prompt suggestion chips.
- **Notifications & Preferences**:
  - Filterable notification feed (Budget Warnings, System Updates, Achievements).
  - Personal profile management & currency switcher (USD, EUR, GBP, INR, CAD).
  - System settings and dark/light theme controls.
- **Theme Engine**:
  - Dark Mode and Light Mode support with smooth CSS custom property transitions and persistent `localStorage` preference saving.

---

## 🛠️ Technology Stack

- **Core**: HTML5, Vanilla JavaScript (ES6+ Modules)
- **Styling**: Modern Vanilla CSS3 using CSS Custom Properties (Variables), Flexbox, CSS Grid, Glassmorphism accents, and Keyframe animations
- **Icons**: FontAwesome 6 (CDN)
- **Typography**: Google Fonts (*Plus Jakarta Sans* & *Inter*)
- **Charts**: Custom HTML5 Canvas & SVG Engine (Zero heavy third-party chart dependencies)
- **Dependencies**: 0 External JS Frameworks (No React, Angular, Vue, Bootstrap, jQuery, or Tailwind)

---

## 📁 Directory & File Structure

```
frontend/
├── index.html              # Main application entry point & session router
├── login.html              # Authentication - Login Page
├── signup.html             # Authentication - User Registration Page
├── forgot-password.html    # Authentication - Password Reset Page
├── dashboard.html          # Overview Dashboard & Metrics Grid
├── expenses.html           # Expenses Management (CRUD, Search, Filter, Pagination)
├── income.html             # Income Sources & History Table
├── budgets.html            # Category Budget Allocations & Progress Bars
├── analytics.html          # Financial Analytics & Interactive Custom Charts
├── ai-insights.html        # AI Insights & Smart Advisory Summary
├── chat.html               # AI Financial Assistant Workspace
├── notifications.html      # Filterable System Notifications Feed
├── profile.html            # User Profile & Currency Settings
├── settings.html           # Application & Security Preferences
├── start_server.py         # Python local HTTP server script (auto-launches browser)
├── package.json            # Node.js npm scripts configuration
└── assets/
    ├── css/
    │   ├── variables.css   # Color palettes, design tokens, Light/Dark mode themes
    │   ├── main.css        # CSS Reset, SaaS grid layout, sidebar drawer, header
    │   ├── components.css  # Cards, tables, modals, inputs, buttons, pagination
    │   └── pages.css       # Chat UI, Analytics canvas styling, AI hero banner
    └── js/
        ├── utils.js        # Currency formatter, toast system, localStorage wrapper
        ├── api.js          # Central API service templates & in-browser mock engine
        ├── auth.js         # Authentication handler & route guard
        ├── app.js          # Shared sidebar drawer controller & theme switcher
        ├── dashboard.js    # Dashboard view controller & skeleton loaders
        ├── expenses.js     # Expenses table CRUD, search, filter & pagination
        ├── income.js       # Income history table & CRUD modal handlers
        ├── budgets.js      # Budget progress bars & allocation update handler
        ├── analytics.js    # HTML5 Canvas line, donut, bar & area charts engine
        ├── ai.js           # Financial summary & recommendation cards renderer
        ├── chat.js          # Interactive AI chat assistant controller
        ├── notifications.js# Notifications feed & tab filter logic
        ├── profile.js      # Personal profile form handler
        └── settings.js     # System settings & theme preference radios
```

---

## 🚀 How to Run the Application

### Method 1: Using Python (Recommended)

Run the automated Python server script which starts the local server and **automatically opens Chrome / default browser** to `http://localhost:8000`:

```powershell
cd "frontend"
py start_server.py
```

### Method 2: Using Node.js (NPM)

```powershell
cd "frontend"
npm start
```

### Method 3: Direct Browser Launch
Open `frontend/index.html` or `frontend/login.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari).

---

## 🔌 Connecting to a Backend REST API (FastAPI / Node.js)

All frontend API calls are centralized in **`assets/js/api.js`**. 

Functions (`getExpenses()`, `createExpense()`, `getIncome()`, `getDashboardData()`, etc.) currently use `async/await` and fallback to `localStorage`.

To connect to your live REST API:
1. Open `assets/js/api.js`.
2. Replace the `Utils.storage` calls with backend `fetch()` requests:

```javascript
// Example: Connecting real backend endpoint
async getExpenses(params = {}) {
  const response = await fetch(`${API_BASE_URL}/expenses`);
  return await response.json();
}
```

No HTML or UI component changes are required!

---


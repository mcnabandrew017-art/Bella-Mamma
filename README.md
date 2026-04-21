# Bella Mamma Pizza Shop

A modern pizza ordering website with backend API and optional desktop app.

## Project Structure

```
bella-mamma-repo/
├── website/          # Frontend website
│   └── index.html    # Main website file
├── backend/          # Node.js + Express API server
│   ├── src/          # Server source code
│   └── package.json
└── desktop-app/      # Electron desktop app (optional)
    ├── main.js
    └── package.json
```

## Quick Start

### Option 1: Run as Local Website

1. **Start the backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend runs at http://localhost:3000

2. **Open the website:**
   - Navigate to `website/index.html` in your browser
   - Or use: http://localhost:3000/website/index.html

### Option 2: Run Desktop App

1. **Install Electron:**
   ```bash
   cd desktop-app
   npm install electron --save-dev
   ```

2. **Start the backend** (in another terminal):
   ```bash
   cd backend
   npm start
   ```

3. **Run the desktop app:**
   ```bash
   npx electron main.js
   ```

## Features

- 🍕 Browse pizza menu with categories
- 🛒 Shopping cart functionality
- 🎨 Pizza customizer (size, crust, toppings)
- 📱 Mobile-responsive design
- 👨‍🍳 Kitchen view for order preparation
- 🔐 Admin panel for menu management

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js, Express, SQLite (sql.js)
- **Desktop:** Electron (optional)

## License

MIT

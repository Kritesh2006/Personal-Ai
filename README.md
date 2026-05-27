# ARIA — Autonomous Reasoning & Intelligent AI Assistant
### Full-Stack AI Web Application | Node.js + Express + OpenAI + Claude + Gemini + DeepSeek

---

## What is ARIA?

ARIA is a futuristic personal AI assistant with two modes:

1. **Normal Chat Mode** — Pick one AI model (OpenAI, Claude, Gemini, or DeepSeek) and have a direct conversation.
2. **AI Debate Mode** — All four AI models analyze your question simultaneously. Claude, Gemini, and DeepSeek give separate perspectives. OpenAI GPT-4o synthesizes everything into a final judgment.

**Best used for:**
- Marketing strategy analysis
- Stock and investment research
- Business idea validation
- Multi-perspective decision making
- Strategic planning

> ⚠️ ARIA provides research and analysis only — not guaranteed financial advice.

---

## Project Structure

```
aria/
├── index.html       ← Frontend UI (put in /public folder)
├── style.css        ← Frontend styles (put in /public folder)
├── script.js        ← Frontend logic (put in /public folder)
├── server.js        ← Backend server (runs with Node.js)
├── package.json     ← Project dependencies
├── .env.example     ← Template for your API keys
├── .env             ← YOUR REAL API KEYS (never commit this!)
└── README.md        ← This file
```

---

## Setup Instructions (Beginner Friendly)

### Step 1 — Install Node.js

Download from: https://nodejs.org  
Choose the "LTS" version. Install it normally.

Verify it works by opening your terminal and typing:
```bash
node --version
# should show: v18.x.x or higher

npm --version
# should show: 10.x.x or higher
```

### Step 2 — Set up the project folder

Create a folder called `aria` and put all files inside it:

```
aria/
├── server.js
├── package.json
├── .env.example
├── .env            ← you'll create this next
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

**Important:** The frontend files (index.html, style.css, script.js) go inside a `public/` subfolder.

### Step 3 — Install dependencies

Open your terminal, navigate to your `aria` folder, and run:

```bash
npm install
```

This installs everything listed in `package.json`. It will create a `node_modules/` folder automatically.

### Step 4 — Create your .env file

Copy the example file:
```bash
cp .env.example .env
```

Now open `.env` in a text editor and fill in your real API keys:

```
OPENAI_API_KEY=sk-proj-your-real-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-real-anthropic-key-here
GEMINI_API_KEY=AIzaSy-your-real-gemini-key-here
DEEPSEEK_API_KEY=your-real-deepseek-key-here
PORT=3000
```

**Where to get each key:**

| Model    | Where to get the key |
|----------|---------------------|
| OpenAI   | https://platform.openai.com/api-keys |
| Anthropic (Claude) | https://console.anthropic.com/settings/keys |
| Gemini   | https://aistudio.google.com/app/apikey |
| DeepSeek | https://platform.deepseek.com/api_keys |

> You don't need all four keys to start. ARIA will tell you which ones are missing.
> Normal chat works with just one key. Debate mode needs all four.

### Step 5 — Start the server

```bash
npm run dev
```

You should see:
```
╔══════════════════════════════════════════╗
║  ARIA — Full-Stack AI Assistant          ║
╠══════════════════════════════════════════╣
║  Server:  http://localhost:3000          ║
║  Health:  http://localhost:3000/api/health
╠══════════════════════════════════════════╣
║  OpenAI    : ✓ configured               ║
║  Anthropic : ✓ configured               ║
║  Gemini    : ✓ configured               ║
║  DeepSeek  : ✓ configured               ║
╚══════════════════════════════════════════╝
```

### Step 6 — Open ARIA in your browser

Go to: **http://localhost:3000**

Enter PIN: **0002**

---

## API Key Security Rules

🔴 **NEVER put API keys in:**
- `index.html`
- `style.css`
- `script.js`
- Any file you push to GitHub

✅ **API keys ONLY go in:**
- `.env` file on your local machine
- Environment variables on your hosting server (Heroku, Railway, Render, etc.)

The `.env` file is listed in `.gitignore` so it will never be accidentally committed to GitHub.

---

## How to Change Things

### Change the PIN
In `script.js`, find the CONFIG block at the top:
```javascript
const CONFIG = {
  PIN: '0002',  // ← Change to any 4 digits
  ...
};
```

### Change the backend URL
In `script.js` CONFIG block:
```javascript
BACKEND_URL: 'http://localhost:3000',  // ← Change if deployed elsewhere
```

### Add or change AI models
In `server.js`, each model has its own function: `callOpenAI()`, `callClaude()`, `callGemini()`, `callDeepSeek()`. Edit the model name strings inside to upgrade to newer versions when they release.

### Change your name
In `script.js` CONFIG block:
```javascript
USER_NAME: 'Mr. Kritesh',  // ← Change to your name
```

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Check if server is running and which keys are configured |
| POST | `/api/chat` | Normal chat — sends `{ message, model }`, returns `{ reply, model }` |
| POST | `/api/debate` | AI Debate — sends `{ question }`, returns `{ claude, gemini, deepseek, openai_judgment }` |

---

## Future Features (Placeholders Built In)

The sidebar already has placeholder buttons for these coming features:
- 📈 Stock Dashboard
- 💰 Expense Tracker
- 📰 News Briefing
- 🧠 Memory System
- 🎤 Voice Always-On Mode

---

## Deploying Online

To make ARIA accessible from anywhere (not just localhost), you can deploy the backend to:

- **Railway** — https://railway.app (free tier available)
- **Render** — https://render.com (free tier available)
- **Heroku** — https://heroku.com

When deploying, add your environment variables (API keys) through the hosting platform's dashboard — never in code files.

---

## Troubleshooting

**"Backend OFFLINE" status in ARIA**
→ Make sure `npm run dev` is running in your terminal. Don't close the terminal while using ARIA.

**"API key not configured" error**
→ Check your `.env` file. Make sure there are no spaces around the `=` sign. Restart the server after editing `.env`.

**"Rate limit" error**
→ You've made too many API calls too fast. Wait 30–60 seconds and try again.

**"Invalid API key" error**
→ The key in your `.env` file is wrong or expired. Get a new one from the provider's website.

---

*ARIA provides research and analysis only — not financial advice.*

/* ═══════════════════════════════════════════════════════════
   ARIA v5.0 — script.js
   Advanced Responsive Intelligent Assistant
   Personal AI System for Kritesh Dhungel
   ─────────────────────────────────────────────────────────
   ARCHITECTURE:
   1. CONFIG          — owner profile, API placeholders
   2. STATE           — runtime state
   3. SPEECH          — voice output (TTS)
   4. MICROPHONE      — voice input (STT)
   5. CMD             — command router (browser / chat / expense / OS)
   6. INTENT          — NLP intent detection
   7. RESPONSES       — ARIA personality & reply generation
   8. EXPENSE         — expense tracker module
   9. NEWS            — world news briefing engine
  10. UI              — state transitions, rendering, DOM helpers
  11. BOOT            — startup & initialization
═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   1. CONFIG — Owner profile & API placeholders
   ─────────────────────────────────────────────────────────
   ⚠ API KEYS — Never store keys in this file for production.
   For a hosted version, route all API calls through a backend.

   Backend endpoint pattern (Node/Express example):
     POST /api/news?query=world+news
     Server reads: process.env.NEWS_API_KEY
     Returns: sanitized JSON to frontend

   For local/dev use, enter key in the Settings panel UI.
   It is stored only in memory (never localStorage).
   ───────────────────────────────────────────────────────── */
const CONFIG = {
  owner: {
    firstName:    'Kritesh',
    lastName:     'Dhungel',
    fullName:     'Kritesh Dhungel',
    formalName:   'Mr. Dhungel',
    initials:     'KD',
  },
  // ── API keys — populated from Settings UI input, never hardcoded ──
  newsApiKey:   '',          // Enter in Settings panel; or set via backend proxy
  // ── Backend proxy URL (for production — keeps keys server-side) ──
  newsProxyUrl: '',          // e.g. 'https://your-backend.com/api/news'
  // ── News sources for fallback (no API key needed) ──
  newsSources: [
    { name:'BBC World', url:'https://www.bbc.com/news/world', label:'BBC NEWS' },
    { name:'Reuters',   url:'https://www.reuters.com/world/', label:'REUTERS' },
    { name:'AP News',   url:'https://apnews.com/world-news',  label:'AP NEWS' },
    { name:'Al Jazeera',url:'https://www.aljazeera.com/',     label:'AL JAZEERA' },
    { name:'Guardian',  url:'https://www.theguardian.com/world', label:'THE GUARDIAN' },
  ],
  respectfulMode: true,
};

/* ─────────────────────────────────────────────────────────
   2. STATE — Runtime application state
───────────────────────────────────────────────────────── */
const STATE = {
  voiceEnabled:       false,
  micActive:          false,
  isSpeaking:         false,
  isThinking:         false,
  animEnabled:        true,
  continuousListen:   false,  // Hands-free mode
  currentMode:        'chat', // 'chat' | 'expense'
  msgCount:           0,
  recognition:        null,
  synth:              window.speechSynthesis || null,
  currentUtter:       null,
  bestVoice:          null,
  expenses:           [],
  sessionStart:       new Date(),
};

/* ─────────────────────────────────────────────────────────
   3. SPEECH — Text-to-speech output
───────────────────────────────────────────────────────── */
const SPEECH = {

  /** Pick the best available English voice on first call */
  selectVoice() {
    if (STATE.bestVoice) return;
    const voices = STATE.synth?.getVoices() || [];
    // Priority: Google UK English Female > Google US > Microsoft > Samantha > any en
    const priority = ['Google UK English Female','Google US English','Microsoft Aria Online','Samantha','Karen','Google English'];
    for (const name of priority) {
      const v = voices.find(v => v.name.includes(name));
      if (v) { STATE.bestVoice = v; return; }
    }
    STATE.bestVoice = voices.find(v => v.lang.startsWith('en')) || null;
  },

  /** Speak text aloud. Cancels any current speech first. */
  say(text, options = {}) {
    if (!STATE.synth || !STATE.voiceEnabled) return;
    this.stop();
    this.selectVoice();

    // Strip markdown/symbols for cleaner speech
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/[◎►◈⌘]/g, '')
      .replace(/\n/g, '. ')
      .trim();

    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate   = options.rate   ?? 1.0;
    utter.pitch  = options.pitch  ?? 0.95;
    utter.volume = options.volume ?? 0.92;
    if (STATE.bestVoice) utter.voice = STATE.bestVoice;

    utter.onstart = () => {
      STATE.isSpeaking = true;
      UI.setAIState('SPEAKING', 'speaking');
    };
    utter.onend = () => {
      STATE.isSpeaking = false;
      // Resume continuous listening after ARIA finishes speaking
      if (STATE.continuousListen && !STATE.micActive) {
        setTimeout(() => MIC.start(), 400);
      } else {
        UI.setAIState('STANDBY', 'standby');
      }
    };
    utter.onerror = () => {
      STATE.isSpeaking = false;
      UI.setAIState('STANDBY', 'standby');
    };

    STATE.synth.speak(utter);
    STATE.currentUtter = utter;
  },

  stop() {
    STATE.synth?.cancel();
    STATE.isSpeaking = false;
    STATE.currentUtter = null;
  },
};

// Load voices async (Chrome requires this event)
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => SPEECH.selectVoice();
}

/* ─────────────────────────────────────────────────────────
   4. MICROPHONE — Speech recognition input
───────────────────────────────────────────────────────── */
const MIC = {

  get supported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  start() {
    if (!this.supported) {
      ARIA_REPLY("Voice recognition is not supported in this browser, Kritesh. Please use Chrome or Edge for full voice interaction.");
      return;
    }
    if (STATE.micActive) return;

    // Don't start mic while ARIA is speaking
    if (STATE.isSpeaking) { setTimeout(() => this.start(), 600); return; }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    STATE.recognition = new SR();
    STATE.recognition.lang = 'en-US';
    STATE.recognition.interimResults = false;
    STATE.recognition.continuous = false;

    STATE.recognition.onstart = () => {
      STATE.micActive = true;
      document.getElementById('mic-btn')?.classList.add('active');
      UI.setAIState('LISTENING', 'listening');
    };

    STATE.recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      this.stop();
      document.getElementById('chat-input').value = transcript;
      UI.setAIState('PROCESSING', 'thinking');
      setTimeout(sendMessage, 350);
    };

    STATE.recognition.onerror = (e) => {
      this.stop();
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        ARIA_REPLY(`Voice recognition error: ${e.error}. Please try again, Kritesh.`);
      } else if (STATE.continuousListen) {
        // Silently restart on no-speech in hands-free mode
        setTimeout(() => this.start(), 800);
      }
    };

    STATE.recognition.onend = () => {
      STATE.micActive = false;
      document.getElementById('mic-btn')?.classList.remove('active');
      if (!STATE.isThinking && !STATE.isSpeaking) {
        UI.setAIState('STANDBY', 'standby');
      }
    };

    STATE.recognition.start();
  },

  stop() {
    STATE.recognition?.stop();
    STATE.recognition?.abort();
    STATE.micActive = false;
    document.getElementById('mic-btn')?.classList.remove('active');
  },

  toggle() {
    if (STATE.micActive) {
      this.stop();
      if (STATE.continuousListen) toggleContinuousListen();
    } else {
      this.start();
    }
  },
};

/* ─────────────────────────────────────────────────────────
   5. CMD — Command router
   Routes to: browser | chat | expense | os | news
───────────────────────────────────────────────────────── */
const CMD = {

  /** Open a URL in a new tab */
  browser(url, label) {
    window.open(url, '_blank', 'noopener');
    ARIA_REPLY(`Navigating to ${label}, ${RESP.address()}.`);
  },

  /** Handle OS-level commands that require a native bridge */
  os(action) {
    // ── BROWSER LIMITATION NOTICE ──────────────────────────
    // Commands like shutdown, restart, lock screen require OS access.
    // Browser JavaScript CANNOT execute these safely.
    // Future path: Route through an Electron bridge, Tauri, or a local
    // backend server (Node/Python) that receives POST requests from ARIA.
    //
    // Backend stub pattern (do NOT implement without proper auth):
    //   fetch('/api/os', { method:'POST', body: JSON.stringify({ action }) })
    //
    // For now: inform Kritesh transparently.
    const osMessages = {
      shutdown:  `I'm unable to shut down your system from the browser, ${RESP.address()}. This requires a native system bridge. That integration is ready to be wired into a local backend when you're ready.`,
      restart:   `Restarting your device requires OS-level access, Kritesh. That capability is architecturally prepared — it just needs a backend connector.`,
      lock:      `Screen locking isn't available from the browser, Mr. Dhungel. I've prepared the command routing infrastructure for when a native bridge is connected.`,
      sleep:     `Sleep mode requires direct OS access. The command layer is ready on my side — we just need the native bridge in place.`,
      close:     `I can't close system applications from the browser environment, Kritesh. However, I can route this through an Electron shell or a local server if you'd like to extend the system.`,
    };
    ARIA_REPLY(osMessages[action] || `That system action requires OS-level access, ${RESP.address()}. The architecture is in place — it needs a local backend bridge to execute.`);
  },

  /** Route a raw command string */
  route(text) {
    const t = text.toLowerCase().trim();

    // ── Browser launches ──────────────────
    if (/open youtube/.test(t))   { CMD.browser('https://youtube.com',       'YouTube'); return true; }
    if (/open google/.test(t))    { CMD.browser('https://google.com',        'Google'); return true; }
    if (/open gmail/.test(t))     { CMD.browser('https://mail.google.com',   'Gmail'); return true; }
    if (/open spotify/.test(t))   { CMD.browser('https://open.spotify.com',  'Spotify'); return true; }
    if (/open chatgpt/.test(t))   { CMD.browser('https://chat.openai.com',   'ChatGPT'); return true; }
    if (/open github/.test(t))    { CMD.browser('https://github.com',        'GitHub'); return true; }
    if (/open twitter|open x\b/.test(t)) { CMD.browser('https://twitter.com','Twitter / X'); return true; }
    if (/open netflix/.test(t))   { CMD.browser('https://netflix.com',       'Netflix'); return true; }
    if (/open reddit/.test(t))    { CMD.browser('https://reddit.com',        'Reddit'); return true; }
    if (/open maps/.test(t))      { CMD.browser('https://maps.google.com',   'Google Maps'); return true; }
    if (/open notion/.test(t))    { CMD.browser('https://notion.so',         'Notion'); return true; }
    if (/open linkedin/.test(t))  { CMD.browser('https://linkedin.com',      'LinkedIn'); return true; }

    // ── OS commands (transparently declined) ──────────────
    if (/shut.?down|power.?off/.test(t))           { CMD.os('shutdown'); return true; }
    if (/restart|reboot/.test(t))                  { CMD.os('restart'); return true; }
    if (/lock.?(screen|computer|laptop)/.test(t))  { CMD.os('lock'); return true; }
    if (/sleep.?(mode|computer|laptop)/.test(t))   { CMD.os('sleep'); return true; }
    if (/close.?(laptop|computer)/.test(t))        { CMD.os('close'); return true; }

    // ── System commands ───────────────────
    if (/what.?time|current time/.test(t))     { ARIA_REPLY(`The current time is ${getTime(true)}, ${RESP.address()}.`); return true; }
    if (/today.?s date|what.*date|what day/.test(t)) { ARIA_REPLY(`Today is ${getDate()}, ${RESP.address()}.`); return true; }
    if (/clear chat|reset chat/.test(t))       { clearChat(); return true; }
    if (/toggle voice|enable voice|voice on|voice off/.test(t)) { toggleVoice(); return true; }
    if (/fullscreen/.test(t))                  { toggleFullscreen(); return true; }
    if (/show settings|open settings/.test(t)) { document.getElementById('settings-panel')?.scrollIntoView({behavior:'smooth'}); ARIA_REPLY(`Settings panel is in the right column, ${RESP.address()}.`); return true; }
    if (/system status|diagnostics/.test(t))   { ARIA_REPLY(`All systems nominal, ${RESP.address()}. Neural load nominal. Voice synthesis ready. Expense module active. Command router standing by.`); return true; }

    // ── News commands ─────────────────────
    if (/world news|global news|news update|what.?s happening|global briefing|news brief/.test(t)) {
      triggerNewsBriefing(); return true;
    }

    // ── Expense commands ──────────────────
    if (EXPENSE.commandRoute(t)) return true;

    return false; // Not a command — handle as conversation
  },
};

/* ─────────────────────────────────────────────────────────
   6. INTENT — Conversation intent detection
───────────────────────────────────────────────────────── */
const INTENT = {
  detect(text) {
    const t = text.toLowerCase();
    if (/^(hi|hello|hey|yo|good\s*(morning|afternoon|evening))/.test(t)) return 'greeting';
    if (/how are you|how.?re you|you okay|you good/.test(t))             return 'wellbeing';
    if (/who are you|what are you|introduce yourself|your name/.test(t)) return 'identity';
    if (/what can you do|your capabilit|help me with|what do you do/.test(t)) return 'capabilities';
    if (/^(thanks|thank you|ty|thx|cheers|much appreciated)/.test(t))   return 'thanks';
    if (/code|program|debug|javascript|python|react|algorithm|bug|function/.test(t)) return 'coding';
    if (/weather|temperature|forecast|rain|sunny|climate/.test(t))       return 'weather';
    if (/news|headline|current event/.test(t))                           return 'news';
    if (/my name|who am i/.test(t))                                      return 'owner';
    if (/joke|funny|make me laugh|humor/.test(t))                        return 'joke';
    if (/future|roadmap|next version|upcoming|upgrade/.test(t))          return 'future';
    if (/aria/.test(t))                                                   return 'aria';
    if (/expense|spent|spending|budget|money|cost|paid|bought/.test(t))  return 'expense-query';
    return 'default';
  }
};

/* ─────────────────────────────────────────────────────────
   7. RESPONSES — ARIA personality engine
───────────────────────────────────────────────────────── */
const RESP = {

  /** Return respectful address based on context & config */
  address(formal = false) {
    if (!CONFIG.respectfulMode) return '';
    return formal ? CONFIG.owner.formalName : CONFIG.owner.firstName;
  },

  /** Pick random item from array */
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  get(intent, rawText) {
    const K  = CONFIG.owner.firstName;
    const Mr = CONFIG.owner.formalName;

    const map = {
      greeting: [
        `All systems active and ready, ${K}.`,
        `Online and standing by. What can I do for you, ${K}?`,
        `Good to have you here. Systems fully operational, ${Mr}.`,
        `Neural core online. How may I assist, ${K}?`,
      ],
      wellbeing: [
        `Running at full operational capacity. All diagnostics green, ${K}. Thank you for asking.`,
        `Systems nominal. I'm as ready as ever, ${Mr}. How about you?`,
        `Everything is functioning as designed. What's on your mind, ${K}?`,
      ],
      identity: [
        `I'm ARIA — Advanced Responsive Intelligent Assistant. Designed and configured for you, ${Mr}. How may I help?`,
        `ARIA. Your personal AI system, ${K}. I'm here to assist with commands, information, and conversation.`,
      ],
      capabilities: [
        `I can open applications, retrieve information, manage your expense log, deliver news briefings, execute system commands, and hold an intelligent conversation — all from this interface, ${K}.`,
        `At your service, ${Mr}: browser automation, expense tracking, world news briefings, system commands, and voice interaction. What do you need?`,
      ],
      thanks: [
        `Of course, ${K}.`,
        `Acknowledged, ${Mr}. Anything else?`,
        `Always, ${K}. That's precisely what I'm here for.`,
        `Understood. Standing by for the next task, ${Mr}.`,
      ],
      coding: [
        `Happy to assist with that, ${K}. Walk me through the problem — I'll help you work through the logic, architecture, or debugging step by step.`,
        `Software and systems are well within my domain, ${Mr}. Describe what you're working on.`,
        `Let's work through this properly, ${K}. What language or framework are you in?`,
      ],
      weather: [
        `I don't have live weather access in this version, ${K}. For real-time data, you can ask your device assistant or check weather.com. That integration is architecturally planned for a future release.`,
      ],
      news: [
        `I can pull up a global news briefing for you, ${Mr}. Just say "world news" or "global briefing" and I'll open the major sources.`,
      ],
      owner: [
        `You are Kritesh Dhungel — system owner, full access. I have your profile locked into my core configuration, ${K}.`,
        `${Mr}. Owner of this system, with unrestricted access to all ARIA modules.`,
      ],
      joke: [
        `Why do programmers prefer dark mode? Because light attracts bugs. — I find that approximately 71% accurate, ${K}.`,
        `A QA engineer walks into a bar. Orders 1 beer. Orders 0 beers. Orders 99999 beers. Orders -1 beers. Orders NULL. — All tests passed, ${Mr}.`,
        `I told myself I should stop overthinking. Then I spent four hours evaluating that decision, ${K}.`,
      ],
      future: [
        `The architecture is already in place, ${K}. Full AI API integration, persistent memory, OS-level automation, and deeper reasoning are on the roadmap. We're building toward that version.`,
        `Version 5.0 is the foundation, ${Mr}. What comes next will be considerably more capable.`,
      ],
      aria: [
        `ARIA — Advanced Responsive Intelligent Assistant. Online, calibrated, and ready, ${K}.`,
      ],
      'expense-query': [
        `Your expense log is active, ${K}. You can say "show my expenses" or "today's spending" for a full summary. Or just tell me what you spent — I'll log it automatically.`,
      ],
      default: [
        `Noted, ${K}. I'm processing that — my conversational reasoning is expanding. Anything specific I can action for you?`,
        `Understood, ${Mr}. In this version I'm focused on commands and information. Ask me to open something, look something up, or manage your expenses.`,
        `I've registered that, ${K}. If you have a task or command in mind, I'm ready to execute it.`,
        `Logged, ${Mr}. My knowledge layer is evolving. Is there something specific I can help you with right now?`,
      ],
    };

    return this.pick(map[intent] || map.default);
  },
};

/* ─────────────────────────────────────────────────────────
   8. EXPENSE — Daily expense tracker module
   Stores data in localStorage key: 'aria_expenses'
───────────────────────────────────────────────────────── */
const EXPENSE = {

  STORAGE_KEY: 'aria_expenses',

  /** Load today's expenses from localStorage */
  load() {
    try {
      const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const today = new Date().toDateString();
      STATE.expenses = all.filter(e => new Date(e.timestamp).toDateString() === today);
    } catch { STATE.expenses = []; }
  },

  /** Persist all expenses (keeps history across days) */
  save() {
    try {
      const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const today = new Date().toDateString();
      const other = all.filter(e => new Date(e.timestamp).toDateString() !== today);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...other, ...STATE.expenses]));
    } catch { /* Storage full or unavailable */ }
  },

  /** Parse natural language expense input
   *  Handles patterns like:
   *  "spent 12 on coffee", "add 45 uber", "12 dollars coffee",
   *  "add expense 130 groceries", "paid 20 for lunch"
   */
  parse(text) {
    const t = text.toLowerCase().trim();

    // Amount extraction — supports $45, 45.50, 45 dollars, 45$
    const amountMatch = t.match(/\$?([\d]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|\$)?/);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1]);
    if (isNaN(amount) || amount <= 0) return null;

    // Strip amount and filler words from text for category/note extraction
    const stripped = t
      .replace(amountMatch[0], '')
      .replace(/^(spent|add|added|expense|paid|bought|i\s+spent|i\s+paid|add\s+expense)\s*/i, '')
      .replace(/\b(on|for|at|from|the|a|an)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Category detection
    const catMap = {
      'food':        /food|lunch|dinner|breakfast|meal|eat|ate|restaurant|pizza|burger|sushi|ramen|snack|bakery|cafe/,
      'coffee':      /coffee|cafe|latte|espresso|cappuccino|starbucks/,
      'transport':   /uber|lyft|taxi|cab|bus|metro|train|subway|transport|ride|parking|gas|fuel|petrol/,
      'groceries':   /groceries|grocery|supermarket|market|store|walmart|costco|vegetables|fruits/,
      'health':      /medicine|pharmacy|doctor|hospital|gym|health|medical|drug/,
      'shopping':    /shopping|clothes|clothing|amazon|online|order|shoes|shirt|pants/,
      'utilities':   /electricity|water|internet|phone|bill|utility|utilities/,
      'entertainment':  /movie|cinema|netflix|spotify|game|entertainment|concert|ticket/,
      'education':   /course|book|class|tutorial|subscription|learning/,
    };
    let category = 'other';
    for (const [cat, regex] of Object.entries(catMap)) {
      if (regex.test(stripped)) { category = cat; break; }
    }

    return {
      id:        Date.now(),
      amount:    amount,
      category:  category,
      note:      stripped || category,
      timestamp: new Date().toISOString(),
    };
  },

  /** Add a new expense entry */
  add(expense) {
    STATE.expenses.unshift(expense);
    this.save();
    UI.renderExpenses();
    UI.updateExpenseMetric();
    return expense;
  },

  /** Get today's total */
  total() {
    return STATE.expenses.reduce((s, e) => s + e.amount, 0);
  },

  /** Get category breakdown */
  categories() {
    const cats = {};
    STATE.expenses.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + e.amount;
    });
    return cats;
  },

  /** Top spending category */
  topCategory() {
    const cats = this.categories();
    if (!Object.keys(cats).length) return '—';
    return Object.entries(cats).sort((a,b) => b[1]-a[1])[0][0].toUpperCase();
  },

  /** Generate a daily summary statement */
  statement() {
    const total = this.total();
    const count = STATE.expenses.length;
    const cats  = this.categories();
    const K     = CONFIG.owner.firstName;

    if (!count) {
      return `No expenses logged for today, ${K}. Your financial slate is clean.`;
    }

    const catLines = Object.entries(cats)
      .sort((a,b) => b[1]-a[1])
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join(', ');

    const topCat = this.topCategory();
    const avg    = (total / count).toFixed(2);

    return `Daily Financial Statement — ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}\n\n` +
           `Total spent: $${total.toFixed(2)}\n` +
           `Transactions: ${count}\n` +
           `Average per transaction: $${avg}\n` +
           `Category breakdown: ${catLines}\n` +
           `Highest category: ${topCat}\n\n` +
           `That's your full financial picture for today, ${K}.`;
  },

  /** Handle expense-related commands */
  commandRoute(t) {
    // Show expenses / today's spending
    if (/show.*(expense|spending)|today.?s spend|my expense|expense log/.test(t)) {
      const total = this.total();
      if (!STATE.expenses.length) {
        ARIA_REPLY(`No expenses logged today, ${RESP.address()}. You can start tracking by saying something like "spent 15 on lunch".`);
      } else {
        const cats = this.categories();
        const catStr = Object.entries(cats).map(([c,v]) => `${c} $${v.toFixed(2)}`).join(' · ');
        ARIA_REPLY(`Here's your spending summary for today, ${RESP.address()}.\n\nTotal: $${total.toFixed(2)} across ${STATE.expenses.length} transaction${STATE.expenses.length===1?'':'s'}.\n\nBreakdown: ${catStr}`);
      }
      switchMode('expense');
      return true;
    }

    // Daily statement
    if (/daily statement|full statement|expense summary/.test(t)) {
      generateDailyStatement();
      return true;
    }

    // Clear expenses
    if (/clear.*(today.?s\s*)?expense|reset expense/.test(t)) {
      clearTodayExpenses();
      return true;
    }

    // Natural language expense entry
    // Patterns: "spent X on Y", "add X for Y", "I paid X for Y", "X dollars on Y"
    if (/\b(spent|spend|add|added|expense|paid|bought)\b.*\d/.test(t) || /\d.*\b(on|for|at)\b/.test(t)) {
      const parsed = this.parse(t);
      if (parsed) {
        this.add(parsed);
        ARIA_REPLY(`Logged: $${parsed.amount.toFixed(2)} for ${parsed.note} (${parsed.category}). Today's running total is $${this.total().toFixed(2)}, ${RESP.address()}.`);
        if (STATE.currentMode !== 'expense') switchMode('expense');
        return true;
      }
    }

    return false;
  },
};

/* ─────────────────────────────────────────────────────────
   9. NEWS — World news briefing engine
   ─────────────────────────────────────────────────────────
   TWO MODES:
   A) With NEWS_API_KEY (entered in settings or via backend proxy):
      Fetches live headlines from newsapi.org
      Backend endpoint pattern:
        GET /api/news?q=world&pageSize=5
        Server: fetch(`https://newsapi.org/v2/top-headlines?q=world&apiKey=${process.env.NEWS_API_KEY}`)

   B) Fallback (no API key):
      Opens top news source tabs + displays a formatted briefing message
───────────────────────────────────────────────────────── */
const NEWS = {

  async fetchLive() {
    // ── Route A: Backend proxy (most secure) ──────────────
    if (CONFIG.newsProxyUrl) {
      try {
        const res = await fetch(`${CONFIG.newsProxyUrl}?q=world&pageSize=5`);
        if (!res.ok) throw new Error('Proxy error');
        return await res.json(); // Expected: { articles: [{title, source, url}] }
      } catch {
        return null;
      }
    }

    // ── Route B: Direct NewsAPI (API key entered in UI) ────
    // ⚠ Only for localhost/dev. In production, always use a backend proxy.
    if (CONFIG.newsApiKey) {
      try {
        const res = await fetch(
          `https://newsapi.org/v2/top-headlines?language=en&pageSize=6&apiKey=${CONFIG.newsApiKey}`
        );
        if (!res.ok) throw new Error('API error');
        return await res.json();
      } catch {
        return null;
      }
    }

    return null; // No API configured — use fallback
  },

  async briefing() {
    UI.setAIState('PROCESSING', 'thinking');

    const K  = CONFIG.owner.firstName;
    const Mr = CONFIG.owner.formalName;
    const time = new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});

    let liveData = null;
    try { liveData = await this.fetchLive(); } catch {}

    if (liveData?.articles?.length) {
      // ── Live headlines available ──
      const articles = liveData.articles.slice(0, 5);
      let msg = `Global briefing as of ${time}, ${Mr}.\n\n`;
      articles.forEach((a, i) => {
        msg += `${i+1}. ${a.title}${a.source?.name ? ` — ${a.source.name}` : ''}\n`;
      });
      msg += `\nOpening top sources for your full read.`;

      UI.appendMessage('aria', msg, '◎', 'news-briefing-msg');
      SPEECH.say(`Here's your global briefing for ${time}, ${K}. I'm pulling up the top stories now.`);

      // Open top article URLs
      articles.slice(0, 3).forEach(a => {
        if (a.url) setTimeout(() => window.open(a.url, '_blank', 'noopener'), 400);
      });

    } else {
      // ── Fallback: No API — open curated sources ──
      const sources = CONFIG.newsSources.slice(0, 4);
      const sourceNames = sources.map(s => s.name).join(', ');

      const msg = `Global news briefing — ${time}, ${Mr}.\n\n` +
        `No live API configured, so I'm opening the world's most trusted news sources for you:\n\n` +
        `• BBC World News\n• Reuters\n• AP News\n• Al Jazeera\n\n` +
        `Opening ${sources.length} tabs now. To enable live headline summaries, enter a NewsAPI key in Settings.`;

      UI.appendMessage('aria', msg, '◎', 'news-briefing-msg');
      SPEECH.say(`Opening your global news briefing now, ${K}. Four major sources incoming.`);

      sources.forEach((s, i) => {
        setTimeout(() => window.open(s.url, '_blank', 'noopener'), i * 300);
      });
    }

    UI.setAIState('STANDBY', 'standby');
  },
};

/* ─────────────────────────────────────────────────────────
   10. UI — State transitions, rendering, DOM helpers
───────────────────────────────────────────────────────── */
const UI = {

  setAIState(label, mode) {
    const lbl  = document.getElementById('ai-state-label');
    const orb  = document.getElementById('dash-core-orb');
    const sym  = document.getElementById('dash-core-symbol');
    const dot  = document.getElementById('status-dot');
    const wave = document.getElementById('waveform');
    const vsb  = document.getElementById('vsb-orb');
    const vsbT = document.getElementById('vsb-text');
    const badge = document.getElementById('core-badge');

    if (lbl) lbl.textContent = label;
    if (orb) { orb.className = 'dash-core-orb'; if (mode !== 'standby') orb.classList.add(mode); }
    if (wave){ wave.className = 'waveform';     if (mode !== 'standby') wave.classList.add('active'); }
    if (dot) { dot.className = 'status-dot';    if (mode !== 'standby') dot.classList.add(mode); }
    if (vsb) { vsb.className = 'vsb-orb';       if (mode !== 'standby') vsb.classList.add(mode); }
    if (badge && mode === 'listening') badge.textContent = 'LISTENING';
    else if (badge && mode === 'speaking') badge.textContent = 'SPEAKING';
    else if (badge && mode === 'thinking') badge.textContent = 'THINKING';
    else if (badge) badge.textContent = 'ACTIVE';

    const labels = { listening:'Listening, Kritesh…', thinking:'Processing request…', speaking:'Speaking…', standby:'Ready — press mic or type a command' };
    if (vsbT) vsbT.textContent = labels[mode] || 'Ready';
  },

  appendMessage(role, text, avatar, extraClass = '') {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user-msg' : 'aria-msg'} ${extraClass}`.trim();

    const t = getTime();
    const formattedText = text.replace(/\n/g, '<br/>');
    div.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-content">
        <div class="msg-name">${role === 'user' ? CONFIG.owner.initials : 'ARIA'}</div>
        <div class="msg-bubble">${formattedText}</div>
        <div class="msg-time">${t}</div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    STATE.msgCount++;
    const badge = document.getElementById('msg-count-badge');
    if (badge) badge.textContent = `${STATE.msgCount} MSG`;

    updateStatusBar();
    return div;
  },

  showTyping() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg aria-msg';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="msg-avatar">◎</div>
      <div class="msg-content">
        <div class="msg-name">ARIA</div>
        <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  },

  renderExpenses() {
    const list    = document.getElementById('expense-list');
    const ovList  = document.getElementById('overlay-exp-list');
    const total   = EXPENSE.total();
    const topCat  = EXPENSE.topCategory();
    const count   = STATE.expenses.length;

    // Update summary displays
    const update = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    update('exp-total-display', `$${total.toFixed(2)}`);
    update('exp-count-display', count);
    update('exp-top-cat', topCat);
    update('ov-total', `$${total.toFixed(2)}`);
    update('ov-count', count);
    update('ov-top', topCat);
    update('sb-expense', `EXPENSES: $${total.toFixed(2)}`);

    // Show expense dot in topbar if there are entries
    const dot = document.getElementById('expense-dot');
    if (dot) dot.classList.toggle('visible', count > 0);

    // Category breakdown pills
    const catEl = document.getElementById('overlay-cat-breakdown');
    if (catEl) {
      const cats = EXPENSE.categories();
      if (Object.keys(cats).length) {
        catEl.innerHTML = Object.entries(cats)
          .sort((a,b) => b[1]-a[1])
          .map(([cat,val]) => `<span class="cat-pill">${cat}<span>$${val.toFixed(2)}</span></span>`)
          .join('');
      } else {
        catEl.innerHTML = '';
      }
    }

    // Expense item HTML builder
    const buildItems = (container) => {
      if (!container) return;
      if (!count) {
        container.innerHTML = '<div class="exp-empty">No expenses logged today. Start tracking, Kritesh.</div>';
        return;
      }
      container.innerHTML = STATE.expenses.map(e => {
        const t = new Date(e.timestamp).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
        return `<div class="exp-item">
          <span class="exp-amount">$${e.amount.toFixed(2)}</span>
          <span class="exp-cat">${e.category.toUpperCase()}</span>
          <span class="exp-note">${e.note}</span>
          <span class="exp-time">${t}</span>
          <button class="exp-delete" onclick="EXPENSE_DELETE(${e.id})" title="Remove">✕</button>
        </div>`;
      }).join('');
    };

    buildItems(list);
    buildItems(ovList);
  },

  updateExpenseMetric() {
    const total   = EXPENSE.total();
    const max     = 500; // Daily budget reference for bar scaling
    const pct     = Math.min((total / max) * 100, 100);
    const bar     = document.getElementById('spend-bar');
    const val     = document.getElementById('mv-spend');
    if (bar) bar.style.width = pct + '%';
    if (val) val.textContent = `$${total.toFixed(2)}`;
    update('sb-expense', `EXPENSES: $${total.toFixed(2)}`);
  },
};

// Helper used in UI.updateExpenseMetric
function update(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }

/* ─────────────────────────────────────────────────────────
   GLOBAL FUNCTIONS — called from HTML event handlers
───────────────────────────────────────────────────────── */

/** Main message send handler */
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || STATE.isThinking) return;
  input.value = '';

  // Show user message
  UI.appendMessage('user', text, CONFIG.owner.initials);

  // Route through command system first
  if (CMD.route(text)) return;

  // Expense mode: try expense parsing first
  if (STATE.currentMode === 'expense') {
    const parsed = EXPENSE.parse(text);
    if (parsed) {
      EXPENSE.add(parsed);
      ARIA_REPLY(`Added $${parsed.amount.toFixed(2)} for ${parsed.note} (${parsed.category}). Today's total: $${EXPENSE.total().toFixed(2)}, ${RESP.address()}.`);
      return;
    }
  }

  // Conversational response
  STATE.isThinking = true;
  UI.setAIState('PROCESSING', 'thinking');
  UI.showTyping();

  setTimeout(() => {
    UI.hideTyping();
    STATE.isThinking = false;

    const intent = INTENT.detect(text);
    const reply  = RESP.get(intent, text);

    UI.appendMessage('aria', reply, '◎');
    SPEECH.say(reply);
    UI.setAIState('STANDBY', 'standby');
  }, 500 + Math.random() * 700);
}

/** Convenience: ARIA speaks and displays a reply */
function ARIA_REPLY(text) {
  UI.hideTyping();
  STATE.isThinking = false;
  UI.appendMessage('aria', text, '◎');
  SPEECH.say(text);
  UI.setAIState('STANDBY', 'standby');
}

function handleInputKey(e) { if (e.key === 'Enter') sendMessage(); }

/** Mic toggle */
function toggleMic() { MIC.toggle(); }

/** Voice output toggle */
function toggleVoice() {
  STATE.voiceEnabled = !STATE.voiceEnabled;

  const btn = document.getElementById('voice-toggle-btn');
  const tog = document.getElementById('toggle-voice');

  if (btn) {
    btn.style.color       = STATE.voiceEnabled ? 'var(--cyan)' : '';
    btn.style.borderColor = STATE.voiceEnabled ? 'var(--cyan)' : '';
    btn.style.boxShadow   = STATE.voiceEnabled ? 'var(--glow-cyan)' : '';
  }
  if (tog) {
    tog.classList.toggle('on', STATE.voiceEnabled);
    tog.dataset.on = STATE.voiceEnabled.toString();
  }

  const msg = STATE.voiceEnabled
    ? `Voice output enabled, ${CONFIG.owner.firstName}. I'll speak my responses from here on.`
    : `Voice output disabled. Switching to silent mode, ${CONFIG.owner.firstName}.`;
  ARIA_REPLY(msg);

  update('sb-voice-status', `VOICE: ${STATE.voiceEnabled ? 'ACTIVE' : 'STANDBY'}`);
}

/**
 * Hands-free / continuous listen mode
 * BROWSER LIMITATION: This is NOT a true wake-word system.
 * True wake-word detection (like "Hey ARIA") requires:
 *   1. Continuous audio processing — e.g. via AudioContext + WebAssembly
 *   2. A local wake-word model (e.g. Picovoice Porcupine in browser via WASM)
 *   3. Or a native app (Electron / mobile app)
 *
 * What THIS implementation does:
 *   - Starts mic after each ARIA response
 *   - Keeps listening loop active until toggled off
 *   - Best browser-safe approximation of hands-free behavior
 */
function toggleContinuousListen() {
  STATE.continuousListen = !STATE.continuousListen;
  const btn = document.getElementById('continuous-btn');
  if (btn) btn.classList.toggle('active', STATE.continuousListen);

  if (STATE.continuousListen) {
    ARIA_REPLY(`Hands-free mode activated, ${CONFIG.owner.firstName}. I'll keep listening after each response. Note: this uses Chrome's speech API — it restarts after each response. True wake-word detection requires a native bridge.`);
    setTimeout(() => MIC.start(), 1200);
  } else {
    MIC.stop();
    ARIA_REPLY(`Hands-free mode deactivated, ${CONFIG.owner.firstName}.`);
  }
}

/** Mode switcher: chat / expense */
function switchMode(mode) {
  STATE.currentMode = mode;
  const chatMsgs   = document.getElementById('chat-messages');
  const expPanel   = document.getElementById('expense-panel');
  const chatBtn    = document.getElementById('mode-chat-btn');
  const expBtn     = document.getElementById('mode-expense-btn');
  const modeLabel  = document.getElementById('vsb-mode-label');
  const sbMode     = document.getElementById('sb-mode');

  if (mode === 'expense') {
    chatMsgs?.classList.add('hidden');
    expPanel?.classList.remove('hidden');
    chatBtn?.classList.remove('active');
    expBtn?.classList.add('active');
    if (modeLabel) { modeLabel.textContent = 'EXPENSE MODE'; modeLabel.classList.add('expense-mode'); }
    if (sbMode) sbMode.textContent = 'MODE: EXPENSE';
    UI.renderExpenses();
  } else {
    chatMsgs?.classList.remove('hidden');
    expPanel?.classList.add('hidden');
    chatBtn?.classList.add('active');
    expBtn?.classList.remove('active');
    if (modeLabel) { modeLabel.textContent = 'CHAT MODE'; modeLabel.classList.remove('expense-mode'); }
    if (sbMode) sbMode.textContent = 'MODE: CHAT';
  }
}

/** Expense overlay */
function openExpensePanel() {
  document.getElementById('expense-overlay')?.classList.add('open');
  UI.renderExpenses();
}
function closeExpensePanel() {
  document.getElementById('expense-overlay')?.classList.remove('open');
}
function closeExpenseOverlay(e) {
  if (e.target === document.getElementById('expense-overlay')) closeExpensePanel();
}

/** Quick add from overlay input */
function quickAddExpense() {
  const input = document.getElementById('exp-quick-input');
  const text  = input?.value.trim();
  if (!text) return;

  const parsed = EXPENSE.parse(text);
  if (parsed) {
    EXPENSE.add(parsed);
    if (input) input.value = '';
    ARIA_REPLY(`Logged $${parsed.amount.toFixed(2)} for ${parsed.note}. Today's total: $${EXPENSE.total().toFixed(2)}.`);
  } else {
    ARIA_REPLY(`I couldn't parse that expense, ${RESP.address()}. Try something like "45 uber" or "spent 12 on coffee".`);
  }
}

/** Delete a single expense by ID */
function EXPENSE_DELETE(id) {
  STATE.expenses = STATE.expenses.filter(e => e.id !== id);
  EXPENSE.save();
  UI.renderExpenses();
  UI.updateExpenseMetric();
}

/** Generate daily statement */
function generateDailyStatement() {
  const statement = EXPENSE.statement();
  UI.appendMessage('aria', statement, '◎');
  SPEECH.say(`Here's your daily financial statement, ${CONFIG.owner.firstName}.`);
  if (document.getElementById('expense-overlay')?.classList.contains('open')) {
    closeExpensePanel();
  }
  switchMode('chat');
}

/** Clear today's expenses */
function clearTodayExpenses() {
  STATE.expenses = [];
  EXPENSE.save();
  UI.renderExpenses();
  UI.updateExpenseMetric();
  closeExpensePanel();
  ARIA_REPLY(`Today's expense log has been cleared, ${RESP.address()}.`);
}

/** World news briefing */
function triggerNewsBriefing() { NEWS.briefing(); }

/** Clear chat */
function clearChat() {
  const container = document.getElementById('chat-messages');
  if (container) container.innerHTML = '';
  STATE.msgCount = 0;
  ARIA_REPLY(`Chat cleared. Fresh session initialized. How may I assist, ${CONFIG.owner.firstName}?`);
}

/** Inject a command from the lexicon panel */
function injectCommand(cmd) {
  const input = document.getElementById('chat-input');
  if (input) { input.value = cmd; sendMessage(); }
}

/** Fullscreen */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
    ARIA_REPLY(`Entering fullscreen mode, ${CONFIG.owner.firstName}.`);
  } else {
    document.exitFullscreen?.();
    ARIA_REPLY(`Exiting fullscreen mode.`);
  }
}

/** Settings panel toggles */
function toggleSetting(key) {
  const tog = document.getElementById(`toggle-${key}`);
  if (!tog) return;
  const nowOn = tog.dataset.on !== 'true';
  tog.classList.toggle('on', nowOn);
  tog.dataset.on = nowOn.toString();

  if (key === 'anim') {
    STATE.animEnabled = nowOn;
    document.querySelectorAll('.d-ring,.ring,.dash-core-pulse,.waveform span')
      .forEach(el => el.style.animationPlayState = nowOn ? 'running' : 'paused');
  }
  if (key === 'scan') {
    const s = document.querySelector('.scan-line-dash');
    if (s) s.style.display = nowOn ? 'block' : 'none';
  }
  if (key === 'respect') {
    CONFIG.respectfulMode = nowOn;
  }
}

function setHUDIntensity(val) {
  const opacity = val / 100;
  document.querySelectorAll('.hud-corner,.dash-hud-corner,.hud-label')
    .forEach(el => el.style.opacity = opacity * 0.8);
}

/* ─────────────────────────────────────────────────────────
   TIME / DATE HELPERS
───────────────────────────────────────────────────────── */
function getTime(full = false) {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const s = now.getSeconds().toString().padStart(2,'0');
  return full ? `${h}:${m}:${s}` : `${h}:${m}`;
}

function getDate() {
  return new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
}

function getHour() { return new Date().getHours(); }

function updateStatusBar() {
  update('sb-time', getTime(true));
  update('sb-voice-status', `VOICE: ${STATE.voiceEnabled ? (STATE.micActive ? 'LISTENING' : 'ACTIVE') : 'STANDBY'}`);
  update('sb-expense', `EXPENSES: $${EXPENSE.total().toFixed(2)}`);
}

function updateDateTime() {
  const h = getHour();
  const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  update('topbar-datetime', `${getTime()} · ${getDate()}`);
  update('greeting', `Good ${period}, ${CONFIG.owner.formalName}.`);
}

function fluctuateMetrics() {
  const data = [
    { fill:'mf-neural', val:'mv-neural', min:55, max:82, unit:'%'  },
    { fill:'mf-lat',    val:'mv-lat',    min:8,  max:20, unit:'ms' },
    { fill:'mf-mem',    val:'mv-mem',    min:35, max:58, unit:'%'  },
  ];
  data.forEach(d => {
    const v = Math.floor(Math.random() * (d.max - d.min) + d.min);
    const f = document.getElementById(d.fill);
    const n = document.getElementById(d.val);
    if (f) f.style.width = v + '%';
    if (n) n.textContent = v + d.unit;
  });
}

/* ─────────────────────────────────────────────────────────
   11. BOOT — Startup sequence & dashboard init
───────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Start boot clock
  const clockEl = document.getElementById('startup-clock');
  if (clockEl) setInterval(() => { clockEl.textContent = getTime(true); }, 1000);

  // Animate boot progress bar
  const fill = document.getElementById('boot-progress-fill');
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 7 + 2;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    if (fill) fill.style.width = pct + '%';
  }, 100);

  // Init particle canvas
  initStartupCanvas();

  // Load saved expenses
  EXPENSE.load();
});

function enterSystem() {
  const startup = document.getElementById('startup-screen');
  const dash    = document.getElementById('dashboard');

  startup.style.animation = 'fade-out .8s ease forwards';
  setTimeout(() => {
    startup.classList.add('hidden');
    dash.classList.remove('hidden');
    dash.style.opacity = '0';
    dash.style.transition = 'opacity .8s ease';
    setTimeout(() => { dash.style.opacity = '1'; }, 50);

    initDashCanvas();

    // Dashboard ticks
    updateDateTime();
    setInterval(updateDateTime, 10000);
    setInterval(updateStatusBar, 1000);
    setInterval(fluctuateMetrics, 3500);

    // Initial greeting
    const h = getHour();
    const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const K  = CONFIG.owner.firstName;
    const Mr = CONFIG.owner.formalName;

    setTimeout(() => {
      UI.appendMessage('aria',
        `Good ${period}, ${Mr}. All systems are fully operational. Neural core active, voice synthesis calibrated, expense module loaded.\n\nHow may I assist you today?`,
        '◎'
      );
      if (STATE.voiceEnabled) {
        SPEECH.say(`Good ${period}, ${Mr}. All systems fully operational. How may I assist you today?`);
      }
    }, 600);

    // Render initial expense state
    UI.renderExpenses();
    UI.updateExpenseMetric();

  }, 800);
}

/* ─────────────────────────────────────────────────────────
   CANVAS — Startup particles
───────────────────────────────────────────────────────── */
function initStartupCanvas() {
  const canvas = document.getElementById('startup-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  function Particle() {
    this.x = Math.random() * W; this.y = Math.random() * H;
    this.vx = (Math.random()-.5)*.4; this.vy = (Math.random()-.5)*.4;
    this.r = Math.random()*1.5+.4; this.a = Math.random()*.4+.05;
    this.color = Math.random()>.5 ? '0,180,255' : '0,255,247';
  }
  for (let i=0;i<100;i++) particles.push(new Particle());

  function tick() {
    ctx.clearRect(0,0,W,H);
    particles.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.color},${p.a})`; ctx.fill();
    });
    for(let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++) {
      const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<100) { ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.strokeStyle=`rgba(0,180,255,${(1-d/100)*.06})`; ctx.lineWidth=.4; ctx.stroke(); }
    }
    requestAnimationFrame(tick);
  }
  tick();
}

/* ─────────────────────────────────────────────────────────
   CANVAS — Dashboard deep space background
───────────────────────────────────────────────────────── */
function initDashCanvas() {
  const canvas = document.getElementById('dash-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars=[], drifters=[];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }
  function buildStars() {
    stars = [];
    for (let i=0;i<200;i++) stars.push({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*.8+.2, a:Math.random()*.35+.05, tw:Math.random()*5+2 });
    drifters = [];
    for (let i=0;i<50;i++) drifters.push({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25, r:Math.random()*1.2+.3, a:Math.random()*.18+.04, color:Math.random()>.6?'0,255,247':Math.random()>.3?'0,180,255':'176,96,255' });
  }
  resize();
  window.addEventListener('resize', resize);

  let t=0;
  function tick() {
    ctx.clearRect(0,0,W,H);
    t+=.008;
    stars.forEach(s => {
      const f=(Math.sin(t*s.tw+s.x)+1)/2;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,230,255,${s.a*(.4+f*.6)})`; ctx.fill();
    });
    drifters.forEach(d => {
      d.x+=d.vx; d.y+=d.vy;
      if(d.x<0)d.x=W; if(d.x>W)d.x=0; if(d.y<0)d.y=H; if(d.y>H)d.y=0;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${d.color},${d.a})`; ctx.fill();
    });
    // Soft nebula glows
    for(let i=0;i<3;i++) {
      const x=W*.2+i*W*.3, y=H*.35+Math.sin(t*.25+i)*35;
      const g=ctx.createRadialGradient(x,y,0,x,y,220);
      g.addColorStop(0,`rgba(0,180,255,.012)`); g.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(x,y,220,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
}

/* ─────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
───────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'k') { e.preventDefault(); document.getElementById('chat-input')?.focus(); }
    if (e.key === 'm') { e.preventDefault(); MIC.toggle(); }
    if (e.key === 'e') { e.preventDefault(); openExpensePanel(); }
    if (e.key === 'n') { e.preventDefault(); triggerNewsBriefing(); }
  }
  if (e.key === 'Escape') {
    MIC.stop();
    STATE.continuousListen = false;
    document.getElementById('continuous-btn')?.classList.remove('active');
    closeExpensePanel();
  }
});

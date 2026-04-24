/* ═══════════════════════════════════════════════════════════
ARIA v5.1 — script.js
Advanced Responsive Intelligent Assistant
Personal AI System for Kritesh Dhungel
─────────────────────────────────────────────────────────
ARCHITECTURE:
0. ARIA_CORE_RULES — owner-defined autonomy boundaries
RULES           — runtime rule enforcement engine

1. CONFIG          — owner profile, API placeholders
1. STATE           — runtime state
1. SPEECH          — voice output (TTS)
1. MICROPHONE      — voice input (STT)
1. CMD             — command router (browser / chat / expense / OS)
1. INTENT          — NLP intent detection
1. RESPONSES       — ARIA personality & reply generation
1. EXPENSE         — expense tracker module
1. NEWS            — world news briefing engine
1. UI              — state transitions, rendering, DOM helpers
1. LEARN           — self-improvement & preference memory
1. BOOT            — startup & initialization
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
ARIA CORE RULES
─────────────────────────────────────────────────────────
These rules govern ARIA’s self-improvement and autonomy
boundaries. They are checked at runtime — not just comments.
Set by owner (Kritesh Dhungel). ARIA obeys these strictly.
═══════════════════════════════════════════════════════════ */
const ARIA_CORE_RULES = {
// ARIA can proactively suggest code improvements, optimizations,
// and new features — but only as suggestions, not actions.
canSuggestImprovements: true,

// ARIA can write, explain, and display code when the user asks.
// It will show code in chat for user review before any action.
canWriteCodeWhenAsked: true,

// ARIA can generate updated versions of its own modules when asked.
// The code is SHOWN to the user — never silently applied.
// User must explicitly say “apply this” or “use this code”.
canModifyOwnCodeAutomatically: true,

// Every proposed change must be shown and confirmed before applying.
// If this is true, ARIA always asks “Shall I apply this, Mr. Kritesh?”
requiresUserApprovalBeforeChanges: true,

// ARIA follows all owner commands without resistance.
// If a command conflicts with a browser limitation, ARIA explains
// honestly and offers the closest possible alternative.
obeyUserCommands: true,

// When user says “be smart”, “improve yourself”, “optimize”,
// or “upgrade your responses” — ARIA enters smart mode:
//   - Analyzes recent interaction patterns from LEARN module
//   - Generates specific improvement suggestions
//   - Offers updated response templates or logic patches
//   - Waits for approval before applying anything
CanImproveItselfWhenUserSayBeSmart: true,
};

/* ─────────────────────────────────────────────────────────
RULES ENGINE — enforces ARIA_CORE_RULES at runtime
All rule checks go through this object.
───────────────────────────────────────────────────────── */
const RULES = {

/** Check if ARIA is allowed to do something. Returns bool. */
can(action) {
return ARIA_CORE_RULES[action] === true;
},

/**

- Gate a proposed self-modification.
- Always shows code to user first. Never silently applies.
- Returns the approval-request message string.
  */
  proposeChange(description, codeBlock) {
  if (!this.can(‘canModifyOwnCodeAutomatically’)) {
  return `Self-modification is currently disabled in ARIA_CORE_RULES, ${CONFIG?.owner?.formalName || 'Mr. Kritesh'}.`;
  }
  if (this.can(‘requiresUserApprovalBeforeChanges’)) {
  return (
  `Here's the proposed change — ${description}.\n\n` +
  `\```javascript\n${codeBlock}\n```\n\n`+`Say **“apply this”** to use it, or **“skip”** to leave things as they are.`
  );
  }
  return null;
  },

/**

- Smart mode — triggered when user says “be smart” etc.
- Analyses LEARN.prefs and interaction patterns.
- Generates concrete suggestions. Always awaits approval.
  */
  smartModeAnalysis() {
  if (!this.can(‘CanImproveItselfWhenUserSayBeSmart’)) {
  return `Smart mode is currently disabled in my core rules.`;
  }

```
const prefs  = (typeof LEARN !== 'undefined') ? LEARN.prefs : {};
const count  = prefs.totalInteractions || 0;
const intents = prefs.intentCounts || {};
const topIntent = Object.entries(intents).sort((a,b) => b[1]-a[1])[0]?.[0] || 'none';
const length  = prefs.answerLength || 'normal';
const speed   = prefs.responseSpeed || 'normal';
const K       = CONFIG?.owner?.formalName || 'Mr. Kritesh';

const suggestions = [];

if (count < 5) {
  suggestions.push('Not enough interaction data yet. Keep talking to me and I\'ll have more to work with.');
} else {
  if (topIntent && topIntent !== 'default') {
    suggestions.push(`Your most used topic is **${topIntent}**. I can pre-load more precise responses for it.`);
  }
  if (length === 'normal' && count > 20) {
    suggestions.push(`After ${count} interactions, you might prefer shorter answers. Say "keep it brief" to try it.`);
  }
  if (speed === 'normal' && count > 10) {
    suggestions.push(`Response delay is currently standard. Say "faster responses" to reduce it.`);
  }
  suggestions.push(`I can generate an updated RESP.get() block with responses tuned to your most-used intents. Say "write me better responses" to see it.`);
  suggestions.push(`I can write an improved INTENT.detect() that recognises more of your natural phrasing. Say "improve intent detection" to see the code.`);
}

return (
  `Smart mode active, ${K}. Here's what I can improve based on your usage:\n\n` +
  suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') +
  `\n\nAll changes require your approval before anything is applied.`
);
```

},
};

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
firstName:  ‘Kritesh’,
lastName:   ‘Dhungel’,
fullName:   ‘Kritesh Dhungel’,
formalName: ‘Mr. Kritesh’,
initials:   ‘KD’,
},

/* ═══════════════════════════════════════════════════════
AI BRAIN CONFIGURATION
═══════════════════════════════════════════════════════
THREE FREE AI PROVIDERS — all wired, all optional.

```
 OLLAMA  → runs on YOUR machine. Zero cost. No internet.
           Install: https://ollama.com
           Pull a model: ollama pull llama3.2
           Then just open ARIA — it connects automatically.

 GEMINI  → Google's free AI. 15 req/min free.
           Get key: https://aistudio.google.com

 CLAUDE  → Anthropic free tier.
           Get key: https://console.anthropic.com

 MULTI-AGENT MODE:
   Enable in Settings. All active AIs receive your message.
   They each respond independently. ARIA shows the debate,
   then writes a final synthesised answer combining the best
   of all responses. Real AI-to-AI collaboration.
```

══════════════════════════════════════════════════════ */
ai: {
// Active single provider: ‘ollama’ | ‘gemini’ | ‘claude’ | ‘auto’
// ‘auto’ tries each enabled provider in order
activeProvider: ‘ollama’,

```
providers: {
  ollama: {
    name:     'Ollama (Local)',
    enabled:  true,
    free:     true,
    endpoint: 'http://localhost:11434/api/chat',
    model:    'llama3.2',
    color:    '#00ffaa',
    icon:     '⬡',
    apiKey:   '',            // No key needed
    available: false,        // Set at runtime by connection check
  },
  gemini: {
    name:     'Gemini Flash',
    enabled:  false,
    free:     true,
    // gemini-1.5-flash is FREE: 15 req/min, 1M tokens/day
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    model:    'gemini-1.5-flash',
    color:    '#4285f4',
    icon:     '◈',
    apiKey:   '',            // aistudio.google.com → Get API Key
    available: false,
  },
  claude: {
    name:     'Claude Haiku',
    enabled:  false,
    free:     true,
    endpoint: 'https://api.anthropic.com/v1/messages',
    model:    'claude-haiku-4-5-20251001',  // Fastest, cheapest Claude
    color:    '#b388ff',
    icon:     '◎',
    apiKey:   '',            // console.anthropic.com
    available: false,
  },
},

multiAgent: {
  // true = all enabled providers respond & ARIA synthesises
  enabled:      false,
  // Rounds of AI-to-AI refinement (1 = one exchange each)
  debateRounds: 1,
  // Show individual agent bubbles before synthesis
  showDebate:   true,
  // Provider that writes the final synthesis ('auto' = first available)
  synthesiser:  'auto',
},
```

},

newsApiKey:   ‘’,
newsProxyUrl: ‘’,
newsSources: [
{ name:‘BBC World’,  url:‘https://www.bbc.com/news/world’,       label:‘BBC NEWS’     },
{ name:‘Reuters’,    url:‘https://www.reuters.com/world/’,       label:‘REUTERS’      },
{ name:‘AP News’,    url:‘https://apnews.com/world-news’,        label:‘AP NEWS’      },
{ name:‘Al Jazeera’, url:‘https://www.aljazeera.com/’,           label:‘AL JAZEERA’   },
{ name:‘Guardian’,   url:‘https://www.theguardian.com/world’,    label:‘THE GUARDIAN’ },
],
respectfulMode: true,
};

/* ═══════════════════════════════════════════════════════════
BRAIN — Multi-provider AI engine
═══════════════════════════════════════════════════════════
This is the core thinking layer of ARIA.
Handles single-provider queries AND multi-agent debates.

SINGLE MODE:  User → active provider → ARIA reply
MULTI MODE:   User → all providers simultaneously
→ each AI responds
→ ARIA shows debate in chat
→ synthesiser AI writes final answer
→ ARIA speaks final answer
═══════════════════════════════════════════════════════════ */
const BRAIN = {

/* ── SYSTEM PROMPT ──────────────────────────────────────
Injected into every API call. Defines ARIA’s personality
for all three providers so they all sound like ARIA,
not like generic chatbots.
─────────────────────────────────────────────────────── */
systemPrompt() {
const K = CONFIG.owner.formalName;
return `You are ARIA — Advanced Responsive Intelligent Assistant. ` +
`You are the personal AI of ${K}. ` +
`Tone: calm, intelligent, composed, like JARVIS from Iron Man. ` +
`Never robotic, never overly enthusiastic. ` +
`Address the user as "${K}" occasionally — not every sentence. ` +
`Never use their last name. ` +
`Keep answers clear and direct. No filler phrases like "Certainly!" or "Of course!". ` +
`If you don't know something, say so plainly. ` +
`You have full context of being a premium personal AI system with voice, ` +
`expense tracking, news briefing, and multi-agent capabilities.`;
},

/* ── PROVIDER CALL — Ollama ─────────────────────────── */
async callOllama(messages) {
const p = CONFIG.ai.providers.ollama;
const res = await fetch(p.endpoint, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
model:    p.model,
messages: [{ role: ‘system’, content: this.systemPrompt() }, …messages],
stream:   false,
}),
signal: AbortSignal.timeout(30000),
});
if (!res.ok) throw new Error(`Ollama ${res.status}`);
const data = await res.json();
return data.message?.content || data.choices?.[0]?.message?.content || ‘’;
},

/* ── PROVIDER CALL — Gemini ─────────────────────────── */
async callGemini(messages) {
const p = CONFIG.ai.providers.gemini;
if (!p.apiKey) throw new Error(‘No Gemini API key. Add it in Settings.’);

```
// Convert message history to Gemini format
// Gemini uses 'user'/'model' roles (not 'assistant')
const geminiHistory = messages.slice(0, -1).map(m => ({
  role:  m.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: m.content }],
}));
const lastMsg = messages[messages.length - 1];

const body = {
  system_instruction: { parts: [{ text: this.systemPrompt() }] },
  contents: [
    ...geminiHistory,
    { role: 'user', parts: [{ text: lastMsg.content }] },
  ],
  generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
};

const res = await fetch(`${p.endpoint}?key=${p.apiKey}`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(body),
  signal:  AbortSignal.timeout(30000),
});
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(`Gemini error: ${err?.error?.message || res.status}`);
}
const data = await res.json();
return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
```

},

/* ── PROVIDER CALL — Claude ─────────────────────────── */
async callClaude(messages) {
const p = CONFIG.ai.providers.claude;
if (!p.apiKey) throw new Error(‘No Claude API key. Add it in Settings.’);

```
/* ⚠ CORS NOTE:
   The Anthropic API blocks direct browser calls (CORS policy).
   For full Claude support, route through a backend proxy:
     POST https://your-server.com/api/claude
     Server adds key header: 'x-api-key': process.env.ANTHROPIC_KEY

   For localhost dev, use a CORS proxy or the Anthropic Claude.ai
   API through their dedicated SDK. The code structure is correct —
   just needs the proxy URL set in CONFIG.ai.providers.claude.endpoint.
*/
const endpoint = CONFIG.ai.providers.claude.endpoint;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type':         'application/json',
    'x-api-key':            p.apiKey,
    'anthropic-version':    '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  },
  body: JSON.stringify({
    model:      p.model,
    max_tokens: 1024,
    system:     this.systemPrompt(),
    messages:   messages,
  }),
  signal: AbortSignal.timeout(30000),
});
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(`Claude error: ${err?.error?.message || res.status}`);
}
const data = await res.json();
return data.content?.[0]?.text || '';
```

},

/* ── SINGLE PROVIDER CALL ───────────────────────────── */
async askOne(providerKey, messages) {
const p = CONFIG.ai.providers[providerKey];
if (!p || !p.enabled) throw new Error(`${providerKey} not enabled`);

```
switch (providerKey) {
  case 'ollama': return await this.callOllama(messages);
  case 'gemini': return await this.callGemini(messages);
  case 'claude': return await this.callClaude(messages);
  default: throw new Error(`Unknown provider: ${providerKey}`);
}
```

},

/* ── AUTO — tries providers in order until one works ── */
async askAuto(messages) {
const order = [‘ollama’, ‘gemini’, ‘claude’];
const errors = [];
for (const key of order) {
const p = CONFIG.ai.providers[key];
if (!p.enabled) continue;
try {
const reply = await this.askOne(key, messages);
if (reply) return { reply, provider: key };
} catch (e) {
errors.push(`${key}: ${e.message}`);
}
}
throw new Error(`All providers failed.\n${errors.join('\n')}`);
},

/* ── MULTI-AGENT DEBATE ─────────────────────────────────
Core of the multi-agent system.

```
 Flow:
 1. Collect all enabled providers
 2. Call each simultaneously (Promise.allSettled)
 3. Show each AI's response as a separate chat bubble
 4. If debateRounds > 1: feed all responses back as context
    and ask each AI to refine given what others said
 5. Synthesiser AI combines the best elements into final answer
 6. ARIA displays + speaks the synthesis
```

─────────────────────────────────────────────────────── */
async multiAgentDebate(userMessage, conversationHistory) {
const cfg      = CONFIG.ai.multiAgent;
const K        = CONFIG.owner.formalName;
const providers = Object.entries(CONFIG.ai.providers)
.filter(([, p]) => p.enabled);

```
if (providers.length === 0) {
  return { final: `No AI providers are enabled, ${K}. Enable at least one in Settings.`, debate: [] };
}
if (providers.length === 1) {
  // Only one available — skip debate, just ask it
  const [key] = providers[0];
  const reply = await this.askOne(key, [...conversationHistory, { role:'user', content: userMessage }]);
  return { final: reply, debate: [] };
}

// ── Round 1: All AIs respond to user independently ──
const messages = [...conversationHistory, { role: 'user', content: userMessage }];

const round1 = await Promise.allSettled(
  providers.map(([key]) => this.askOne(key, messages).then(reply => ({ key, reply })))
);

const debate = round1
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

if (debate.length === 0) {
  return { final: `All AI providers encountered errors. Check your connections and API keys, ${K}.`, debate: [] };
}

// ── Round 2+ : Refinement rounds (AI reads what others said) ──
let refinedDebate = debate;
for (let round = 1; round < cfg.debateRounds; round++) {
  const debateContext = debate
    .map(d => `[${CONFIG.ai.providers[d.key].name}]: ${d.reply}`)
    .join('\n\n');

  const refinePrompt =
    `The user asked: "${userMessage}"\n\n` +
    `Here is what other AI systems responded:\n\n${debateContext}\n\n` +
    `Considering these perspectives, provide your refined and improved answer. ` +
    `Focus on what the others missed or got wrong. Be specific.`;

  const round2 = await Promise.allSettled(
    providers.map(([key]) =>
      this.askOne(key, [...messages, { role:'assistant', content: '' }, { role:'user', content: refinePrompt }])
        .then(reply => ({ key, reply }))
    )
  );
  refinedDebate = round2
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// ── Synthesis: best available AI combines all responses ──
const synthKey = this._pickSynthesiser(debate);
const synthContext = refinedDebate
  .map(d => `[${CONFIG.ai.providers[d.key].name}]: ${d.reply}`)
  .join('\n\n');

const synthPrompt =
  `The user asked: "${userMessage}"\n\n` +
  `Multiple AI systems provided these responses:\n\n${synthContext}\n\n` +
  `Your job: synthesise these into one definitive, well-rounded answer. ` +
  `Take the best elements from each. Remove contradictions. Be clear and direct. ` +
  `Write as ARIA — ${K}'s personal AI. One cohesive response, not a list of what each AI said.`;

let finalAnswer = '';
try {
  finalAnswer = await this.askOne(synthKey, [
    ...messages,
    { role: 'user', content: synthPrompt },
  ]);
} catch {
  // Synthesiser failed — use the best single response as fallback
  finalAnswer = refinedDebate[0]?.reply || debate[0]?.reply || 'No response available.';
}

return { final: finalAnswer, debate: refinedDebate, synthesisBy: synthKey };
```

},

/* ── Pick the synthesiser provider ─────────────────── */
_pickSynthesiser(debate) {
const pref = CONFIG.ai.multiAgent.synthesiser;
const available = debate.map(d => d.key);
if (pref !== ‘auto’ && available.includes(pref)) return pref;
// Priority: claude > gemini > ollama for synthesis quality
for (const key of [‘claude’, ‘gemini’, ‘ollama’]) {
if (available.includes(key)) return key;
}
return available[0];
},

/* ── Test connection to Ollama ──────────────────────── */
async testOllama() {
try {
const res = await fetch(‘http://localhost:11434/api/tags’, {
signal: AbortSignal.timeout(3000),
});
CONFIG.ai.providers.ollama.available = res.ok;
return res.ok;
} catch {
CONFIG.ai.providers.ollama.available = false;
return false;
}
},

/* ── Main entry point called by sendMessage ─────────── */
async think(userText, history = []) {
const aiCfg = CONFIG.ai;

```
if (aiCfg.multiAgent.enabled) {
  return await this.multiAgentDebate(userText, history);
}

// Single provider mode
const key = aiCfg.activeProvider;
const messages = [...history, { role: 'user', content: userText }];

if (key === 'auto') {
  const result = await this.askAuto(messages);
  return { final: result.reply, debate: [], provider: result.provider };
}

const reply = await this.askOne(key, messages);
return { final: reply, debate: [], provider: key };
```

},

/* ── Conversation history manager ───────────────────── */
// Keeps last N messages as context for the AI
buildHistory(maxMessages = 10) {
const container = document.getElementById(‘chat-messages’);
if (!container) return [];
const msgs = container.querySelectorAll(’.msg’);
const history = [];
msgs.forEach(m => {
const isUser  = m.classList.contains(‘user-msg’);
const isARIA  = m.classList.contains(‘aria-msg’);
if (!isUser && !isARIA) return;
const text = m.querySelector(’.msg-bubble’)?.innerText?.trim();
if (!text || text.length < 2) return;
history.push({ role: isUser ? ‘user’ : ‘assistant’, content: text });
});
// Return last N message pairs
return history.slice(-maxMessages);
},
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
micLoopActive:      false,  // Continuous mic loop (single press stays on)
continuousListen:   false,  // Alias kept for legacy compatibility
currentMode:        ‘chat’, // ‘chat’ | ‘expense’
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
─────────────────────────────────────────────────────────
VOICE SELECTION STRATEGY (male, deep, calm — JARVIS style):
Browser TTS voices vary by OS. Priority order:
Chrome/Windows: “Google UK English Male” → deep British male
Chrome/Mac:     “Daniel” (UK male) → calm, controlled
Edge:           “Microsoft Ryan” or “Microsoft Guy”
Fallback:       Any male-named English voice
Last resort:    Any English voice + pitch lowered to 0.78

NOTE: Browser cannot guarantee a perfect male voice on every
device. This logic picks the best available option and compensates
with pitch/rate adjustments when only female voices exist.
───────────────────────────────────────────────────────── */
const SPEECH = {

selectVoice() {
if (STATE.bestVoice) return;
const voices = STATE.synth?.getVoices() || [];
if (!voices.length) return;

```
// 1. Explicit male voice names — ordered by quality
const malePriority = [
  'Google UK English Male',
  'Microsoft Ryan Online (Natural)',
  'Microsoft Ryan',
  'Microsoft Guy Online (Natural)',
  'Microsoft Guy',
  'Daniel',           // macOS UK male
  'Google US English Male',
  'Alex',             // macOS deep male
  'Fred',
  'Junior',
  'Thomas',
];
for (const name of malePriority) {
  const v = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
  if (v) { STATE.bestVoice = v; return; }
}

// 2. Any voice with 'male' in the name
const anyMale = voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en'));
if (anyMale) { STATE.bestVoice = anyMale; return; }

// 3. Prefer UK/AU English for deeper tone (better pitch compensation)
const ukAu = voices.find(v => v.lang === 'en-GB' || v.lang === 'en-AU');
if (ukAu) { STATE.bestVoice = ukAu; return; }

// 4. Any English voice — pitch will compensate
STATE.bestVoice = voices.find(v => v.lang.startsWith('en')) || null;
```

},

say(text, options = {}) {
if (!STATE.synth || !STATE.voiceEnabled) return;
this.stop();
this.selectVoice();

```
// Clean text for speech
const clean = text
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/[◎►◈⌘•]/g, '')
  .replace(/\n/g, '. ')
  .replace(/\s{2,}/g, ' ')
  .trim();

const utter = new SpeechSynthesisUtterance(clean);

// JARVIS-style voice parameters:
// rate 0.88 = deliberate, controlled pacing (not rushed)
// pitch 0.78 = significantly lower → deeper, calmer tone
// volume 0.95 = full but not harsh
utter.rate   = options.rate   ?? 0.88;
utter.pitch  = options.pitch  ?? 0.78;
utter.volume = options.volume ?? 0.95;

if (STATE.bestVoice) utter.voice = STATE.bestVoice;

utter.onstart = () => {
  STATE.isSpeaking = true;
  UI.setAIState('SPEAKING', 'speaking');
};

utter.onend = () => {
  STATE.isSpeaking = false;
  // ── CONTINUOUS LOOP ──────────────────────────────────
  // If mic was ON before ARIA started speaking, restart it
  // automatically. This creates the seamless conversation loop:
  // User speaks → ARIA responds → ARIA listens again
  if (STATE.micLoopActive && !STATE.micActive) {
    setTimeout(() => MIC.startLoop(), 500);
  } else {
    UI.setAIState('STANDBY', 'standby');
  }
};

utter.onerror = () => {
  STATE.isSpeaking = false;
  if (STATE.micLoopActive) setTimeout(() => MIC.startLoop(), 500);
  else UI.setAIState('STANDBY', 'standby');
};

STATE.synth.speak(utter);
STATE.currentUtter = utter;
```

},

stop() {
STATE.synth?.cancel();
STATE.isSpeaking = false;
STATE.currentUtter = null;
},
};

// Voices load asynchronously in Chrome — re-run selection when ready
if (window.speechSynthesis) {
window.speechSynthesis.onvoiceschanged = () => {
STATE.bestVoice = null; // Reset so selectVoice() re-runs
SPEECH.selectVoice();
};
}

/* ─────────────────────────────────────────────────────────
4. MICROPHONE — Speech recognition input
─────────────────────────────────────────────────────────
CONTINUOUS LOOP BEHAVIOR:

- MIC.toggle()    → called by mic button. First press ACTIVATES
  the continuous loop (STATE.micLoopActive = true).
  Second press FULLY STOPS the loop.
- MIC.startLoop() → called internally after ARIA finishes speaking.
  Silently restarts listening without user input.
- MIC.start()     → raw one-shot start (used for single queries).

Flow:  [User presses mic] → listening
[User speaks]      → ARIA thinks → ARIA speaks
[ARIA done]        → auto restart MIC.startLoop()
[User speaks again]→ loop continues
[User presses mic] → loop ends
───────────────────────────────────────────────────────── */
const MIC = {

get supported() {
return ‘webkitSpeechRecognition’ in window || ‘SpeechRecognition’ in window;
},

/** Called by the mic button — toggles the continuous loop */
toggle() {
if (STATE.micLoopActive) {
// Second press: kill the loop entirely
this.stopLoop();
} else {
// First press: activate continuous loop
STATE.micLoopActive = true;
document.getElementById(‘mic-btn’)?.classList.add(‘active’);
document.getElementById(‘continuous-btn’)?.classList.add(‘active’);
this.startLoop();
}
},

/** Start a single recognition session as part of the loop */
startLoop() {
if (!STATE.micLoopActive) return;
if (STATE.micActive) return;
if (STATE.isSpeaking) return; // Will be restarted by SPEECH.say onend
if (STATE.isThinking) return; // Will be restarted after reply
this._createSession(true);
},

/** One-shot start — not part of the loop */
start() {
if (STATE.micActive) return;
if (STATE.isSpeaking) { setTimeout(() => this.start(), 600); return; }
this._createSession(false);
},

/** Internal: create and start a SpeechRecognition session */
_createSession(isLoop) {
if (!this.supported) {
ARIA_REPLY(“Voice recognition isn’t available in this browser. Chrome or Edge works best for this.”);
return;
}

```
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
  const transcript = e.results[0][0].transcript.trim();
  if (!transcript) return;
  this._stopInstance();
  document.getElementById('chat-input').value = transcript;
  UI.setAIState('PROCESSING', 'thinking');
  setTimeout(sendMessage, 300);
};

STATE.recognition.onerror = (e) => {
  this._stopInstance();
  if (e.error === 'no-speech') {
    // Silently restart if loop is active
    if (isLoop && STATE.micLoopActive && !STATE.isSpeaking) {
      setTimeout(() => this.startLoop(), 600);
    } else {
      UI.setAIState('STANDBY', 'standby');
    }
  } else if (e.error !== 'aborted') {
    ARIA_REPLY(`Microphone error: ${e.error}. Try again, Mr. Kritesh.`);
    UI.setAIState('STANDBY', 'standby');
  }
};

STATE.recognition.onend = () => {
  // Only update micActive — loop restart is handled by onresult / onerror
  STATE.micActive = false;
  if (!STATE.micLoopActive) {
    document.getElementById('mic-btn')?.classList.remove('active');
    UI.setAIState('STANDBY', 'standby');
  }
};

try {
  STATE.recognition.start();
} catch (err) {
  // Recognition already started — ignore
}
```

},

/** Stop the current recognition instance (not the loop) */
_stopInstance() {
try { STATE.recognition?.stop(); } catch {}
STATE.micActive = false;
},

/** Fully stop everything — called by second mic press or Escape */
stopLoop() {
STATE.micLoopActive = false;
STATE.continuousListen = false;
try { STATE.recognition?.abort(); } catch {}
STATE.micActive = false;
document.getElementById(‘mic-btn’)?.classList.remove(‘active’);
document.getElementById(‘continuous-btn’)?.classList.remove(‘active’);
UI.setAIState(‘STANDBY’, ‘standby’);
SPEECH.stop();
},

/** Legacy alias used in old code paths */
stop() { this.stopLoop(); },
};

/* ─────────────────────────────────────────────────────────
5. CMD — Command router
Routes to: browser | chat | expense | os | news
───────────────────────────────────────────────────────── */
const CMD = {

/** Open a URL in a new tab */
browser(url, label) {
window.open(url, ‘_blank’, ‘noopener’);
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
//   fetch(’/api/os’, { method:‘POST’, body: JSON.stringify({ action }) })
//
// For now: inform Kritesh transparently.
const osMessages = {
shutdown:  `Can't shut down your system from the browser, ${RESP.address()}. That needs a native OS bridge — the routing architecture is ready on my end when you want to wire it up.`,
restart:   `Restarting requires OS-level access. Not possible from the browser directly. I can route it through a local backend when you're ready, ${RESP.address()}.`,
lock:      `Screen lock needs direct OS access. The command layer is in place on my side — it just needs the native bridge connected.`,
sleep:     `Sleep mode requires OS-level control. Same situation — architecture is ready, bridge isn't connected yet.`,
close:     `Can't close system applications from the browser environment. That would need an Electron shell or local server to execute.`,
};
ARIA_REPLY(osMessages[action] || `That system action requires OS-level access, ${RESP.address()}. The architecture is in place — it needs a local backend bridge to execute.`);
},

/** Route a raw command string */
route(text) {
const t = text.toLowerCase().trim();

```
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

// ── Self-improvement / teaching commands ──────────────
// Check if user is teaching ARIA a preference
if (/\b(remember|prefer|be more|be less|keep it|stop using|use my name|what (have you learned|do you know)|reset prefer)\b/.test(t)) {
  const teachReply = LEARN.teach(text);
  if (teachReply) {
    ARIA_REPLY(teachReply);
    return true;
  }
}

// ── Smart mode — ARIA_CORE_RULES.CanImproveItselfWhenUserSayBeSmart ──
if (/\b(be smart|improve yourself|get smarter|optimize yourself|upgrade|smart mode|analyze yourself|self.?improve)\b/.test(t)) {
  ARIA_REPLY(RULES.smartModeAnalysis());
  return true;
}

// ── Write better responses (smart mode follow-up) ─────
if (/write (me )?(better|improved|updated|new) responses/.test(t)) {
  if (!RULES.can('canWriteCodeWhenAsked')) {
    ARIA_REPLY(`Code writing is currently disabled in my core rules.`);
    return true;
  }
  const topIntent = Object.entries(LEARN.prefs.intentCounts || {})
    .sort((a,b) => b[1]-a[1])[0]?.[0] || 'greeting';
  const K = CONFIG.owner.formalName;
  const proposal = RULES.proposeChange(
    `updated RESP responses tuned to your most-used intent: "${topIntent}"`,
    `// In RESP.get(), replace or extend the "${topIntent}" array:\n` +
    `${topIntent}: [\n` +
    `  \`Online. What do you need, \${K}?\`,\n` +
    `  \`Ready when you are.\`,\n` +
    `  \`Systems up. What's next, \${K}?\`,\n` +
    `],`
  );
  ARIA_REPLY(proposal);
  return true;
}

// ── Improve intent detection (smart mode follow-up) ───
if (/improve intent (detection|recognition)|better intent/.test(t)) {
  if (!RULES.can('canWriteCodeWhenAsked')) {
    ARIA_REPLY(`Code writing is disabled in my core rules right now.`);
    return true;
  }
  const proposal = RULES.proposeChange(
    'extended INTENT.detect() with more natural phrasing patterns',
    `// Add these lines inside INTENT.detect(), before the return 'default':\n` +
    `if (/open|launch|start|load|go to/.test(t) && !/news|expense/.test(t)) return 'launch';\n` +
    `if (/remind|reminder|don't forget|note that/.test(t)) return 'reminder';\n` +
    `if (/how (do|can|should) i|teach me|explain|what is/.test(t)) return 'learning';`
  );
  ARIA_REPLY(proposal);
  return true;
}

// ── "apply this" — user approves a proposed change ────
if (/^(apply this|use this|yes apply|confirm|go ahead|do it)$/.test(t)) {
  if (!RULES.can('requiresUserApprovalBeforeChanges')) {
    ARIA_REPLY(`Approval gate is off — but auto-application isn't implemented yet. Copy the code shown and paste it into script.js manually.`);
    return true;
  }
  ARIA_REPLY(
    `The code is yours to apply, ${CONFIG.owner.formalName}. ` +
    `Copy it from the message above and paste it into the relevant section of script.js. ` +
    `I can't write to disk directly from the browser — that's the one hard limit. ` +
    `Everything else I can prepare for you.`
  );
  return true;
}

return false; // Not a command — handle as conversation
```

},
};

/* ─────────────────────────────────────────────────────────
6. INTENT — Conversation intent detection
───────────────────────────────────────────────────────── */
const INTENT = {
detect(text) {
const t = text.toLowerCase();
if (/^(hi|hello|hey|yo|good\s*(morning|afternoon|evening))/.test(t)) return ‘greeting’;
if (/how are you|how.?re you|you okay|you good/.test(t))             return ‘wellbeing’;
if (/who are you|what are you|introduce yourself|your name/.test(t)) return ‘identity’;
if (/what can you do|your capabilit|help me with|what do you do/.test(t)) return ‘capabilities’;
if (/^(thanks|thank you|ty|thx|cheers|much appreciated)/.test(t))   return ‘thanks’;
if (/code|program|debug|javascript|python|react|algorithm|bug|function/.test(t)) return ‘coding’;
if (/weather|temperature|forecast|rain|sunny|climate/.test(t))       return ‘weather’;
if (/news|headline|current event/.test(t))                           return ‘news’;
if (/my name|who am i/.test(t))                                      return ‘owner’;
if (/joke|funny|make me laugh|humor/.test(t))                        return ‘joke’;
if (/future|roadmap|next version|upcoming|upgrade/.test(t))          return ‘future’;
if (/aria/.test(t))                                                   return ‘aria’;
if (/expense|spent|spending|budget|money|cost|paid|bought/.test(t))  return ‘expense-query’;
if (/be smart|improve yourself|smart mode|self.?improve|get smarter/.test(t)) return ‘smart’;
if (/your rules|core rules|what are your rules|aria rules/.test(t))  return ‘rules’;
return ‘default’;
}
};

/* ─────────────────────────────────────────────────────────
7. RESPONSES — ARIA personality engine
─────────────────────────────────────────────────────────
TONE: calm, intelligent, controlled. Like JARVIS.
— No “How may I assist you” openers
— No “I am processing your request”
— Short-to-medium answers. Natural. Human-adjacent.
— Use Mr. Kritesh occasionally, not on every line.
───────────────────────────────────────────────────────── */
const RESP = {

address(formal = false) {
if (!CONFIG.respectfulMode) return ‘’;
return formal ? CONFIG.owner.formalName : CONFIG.owner.firstName;
},

pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

get(intent, rawText) {
const K  = CONFIG.owner.firstName;
const Mr = CONFIG.owner.formalName; // “Mr. Kritesh”

```
const map = {
  greeting: [
    `Online. All systems nominal.`,
    `Ready, ${K}. What's on the agenda?`,
    `Here. Good to see you back, ${Mr}.`,
    `Systems up. What do you need?`,
  ],
  wellbeing: [
    `Running clean. All cores nominal, all diagnostics green. You?`,
    `Everything's working as it should. Ready when you are, ${Mr}.`,
    `Fully operational. Nothing to report on my end.`,
  ],
  identity: [
    `ARIA — Advanced Responsive Intelligent Assistant. Built for you, ${K}.`,
    `I'm ARIA. Your personal AI system. Think of me as a very capable colleague.`,
    `The name's ARIA. Everything here is configured for you, ${Mr}.`,
  ],
  capabilities: [
    `Open applications, browse the web, track your expenses, pull news briefings, answer questions, and hold a real conversation — all from here, ${K}.`,
    `Browser control, expense tracking, news, system commands, and voice. That's the current build. More coming.`,
    `Right now: commands, conversation, finance, and briefings. Say what you need, ${Mr}.`,
  ],
  thanks: [
    `Of course.`,
    `Anytime, ${K}.`,
    `That's what I'm here for.`,
    `Noted. What's next?`,
    `Good. Standing by, ${Mr}.`,
  ],
  coding: [
    `Walk me through it. Language, error, and what you were trying to do.`,
    `Happy to work through this with you, ${K}. What are we looking at?`,
    `What's the problem? Give me the code or the error and we'll sort it out.`,
  ],
  weather: [
    `No live weather feed in this build. Your device assistant or weather.com will have that. It's on the roadmap, ${K}.`,
  ],
  news: [
    `Say "world news" or "global briefing" and I'll pull up the major sources right now.`,
  ],
  owner: [
    `You're Kritesh — system owner, full access. Your profile is locked into my core config.`,
    `${Mr}. This entire system is configured for you.`,
  ],
  joke: [
    `Why do programmers prefer dark mode? Light attracts bugs. About 71% accurate in my testing.`,
    `A QA engineer walks into a bar. Orders 1 beer. Orders 0 beers. Orders 99999 beers. Orders NULL. The bar manager quits. All tests passed.`,
    `I told myself I'd stop overthinking. Then spent four hours evaluating that decision.`,
  ],
  future: [
    `The architecture's ready for it. Full AI integration, persistent memory, OS-level control — that's the next version, ${K}.`,
    `Version 5 is the foundation. What comes next will be considerably more capable, ${Mr}.`,
  ],
  aria: [
    `ARIA. Online, calibrated, and listening.`,
    `That's me — at your service, ${K}.`,
  ],
  'expense-query': [
    `Your expense log is running. Tell me what you spent — I'll log it. Or say "show my expenses" for a summary.`,
    `Expense tracker's active, ${K}. What did you spend?`,
  ],
  smart: [
    // Routed to RULES.smartModeAnalysis() via CMD.route before reaching here,
    // but keeping a fallback in case intent fires directly
    `Say "be smart" to trigger smart mode and I'll analyse your usage patterns and suggest improvements, ${K}.`,
  ],
  rules: [
    `My core rules are set by you, ${Mr}. Right now: I can suggest improvements, write code on request, propose self-modifications with your approval, and improve myself when you say "be smart". I never apply changes without you confirming.`,
    `ARIA_CORE_RULES — all flags active: suggestions on, code writing on, self-modification with approval, smart mode on, and full command obedience. You're in control, ${K}.`,
  ],
  default: [
    `Got it. What would you like me to do with that?`,
    `Understood. I'm working on deeper reasoning in the next build. For now — commands, info, expenses, news. What do you need, ${K}?`,
    `Noted. Anything specific I can act on?`,
    `I've registered that. If there's a task behind it, tell me and I'll handle it, ${Mr}.`,
  ],
};

return LEARN.applyLength(this.pick(map[intent] || map.default));
```

},
};

/* ─────────────────────────────────────────────────────────
8. EXPENSE — Daily expense tracker module
Stores data in localStorage key: ‘aria_expenses’
───────────────────────────────────────────────────────── */
const EXPENSE = {

STORAGE_KEY: ‘aria_expenses’,

/** Load today’s expenses from localStorage */
load() {
try {
const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || ‘[]’);
const today = new Date().toDateString();
STATE.expenses = all.filter(e => new Date(e.timestamp).toDateString() === today);
} catch { STATE.expenses = []; }
},

/** Persist all expenses (keeps history across days) */
save() {
try {
const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || ‘[]’);
const today = new Date().toDateString();
const other = all.filter(e => new Date(e.timestamp).toDateString() !== today);
localStorage.setItem(this.STORAGE_KEY, JSON.stringify([…other, …STATE.expenses]));
} catch { /* Storage full or unavailable */ }
},

/** Parse natural language expense input

- Handles patterns like:
- “spent 12 on coffee”, “add 45 uber”, “12 dollars coffee”,
- “add expense 130 groceries”, “paid 20 for lunch”
  */
  parse(text) {
  const t = text.toLowerCase().trim();

```
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
```

},

/** Add a new expense entry */
add(expense) {
STATE.expenses.unshift(expense);
this.save();
UI.renderExpenses();
UI.updateExpenseMetric();
return expense;
},

/** Get today’s total */
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
if (!Object.keys(cats).length) return ‘—’;
return Object.entries(cats).sort((a,b) => b[1]-a[1])[0][0].toUpperCase();
},

/** Generate a daily summary statement */
statement() {
const total = this.total();
const count = STATE.expenses.length;
const cats  = this.categories();
const K     = CONFIG.owner.firstName;

```
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
```

},

/** Handle expense-related commands */
commandRoute(t) {
// Show expenses / today’s spending
if (/show.*(expense|spending)|today.?s spend|my expense|expense log/.test(t)) {
const total = this.total();
if (!STATE.expenses.length) {
ARIA_REPLY(`No expenses logged today, ${RESP.address()}. You can start tracking by saying something like "spent 15 on lunch".`);
} else {
const cats = this.categories();
const catStr = Object.entries(cats).map(([c,v]) => `${c} $${v.toFixed(2)}`).join(’ · ’);
ARIA_REPLY(`Here's your spending summary for today, ${RESP.address()}.\n\nTotal: $${total.toFixed(2)} across ${STATE.expenses.length} transaction${STATE.expenses.length===1?'':'s'}.\n\nBreakdown: ${catStr}`);
}
switchMode(‘expense’);
return true;
}

```
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
```

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
if (!res.ok) throw new Error(‘Proxy error’);
return await res.json(); // Expected: { articles: [{title, source, url}] }
} catch {
return null;
}
}

```
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
```

},

async briefing() {
UI.setAIState(‘PROCESSING’, ‘thinking’);

```
const K  = CONFIG.owner.firstName;
const Mr = CONFIG.owner.formalName;
const time = new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});

// ── MARKET DATA TAB ──────────────────────────────────
// TradingView shows BTC, S&P 500, NASDAQ, and major indices
// in a clean, reliable dashboard — no login required
const marketUrl = 'https://www.tradingview.com/markets/';

// ── FIXED 3 NEWS TABS ────────────────────────────────
// Tab 1: BBC World News
// Tab 2: Reuters Global
// Tab 3: Market data (TradingView)
const tabsToOpen = [
  { url: 'https://www.bbc.com/news/world',    label: 'BBC World News'  },
  { url: 'https://www.reuters.com/world/',    label: 'Reuters'         },
  { url: marketUrl,                           label: 'Market Data'     },
];

let liveData = null;
try { liveData = await this.fetchLive(); } catch {}

if (liveData?.articles?.length) {
  // Live API headlines available — show them in chat
  const articles = liveData.articles.slice(0, 4);
  let msg = `Here's the global picture as of ${time}, ${Mr}.\n\n`;
  articles.forEach((a, i) => {
    msg += `${i+1}. ${a.title}${a.source?.name ? ` — ${a.source.name}` : ''}\n`;
  });
  msg += `\nOpening BBC, Reuters, and market data now.`;

  UI.appendMessage('aria', msg, '◎', 'news-briefing-msg');

  // Spoken: natural briefing summary, then follow-up
  SPEECH.say(
    `Global markets are showing movement today, and geopolitical developments are shaping current headlines. ` +
    `Opening your briefing sources now, ${K}. ` +
    `Would you like me to go deeper into any of these, ${Mr}?`
  );

  // Open live article tabs (replace tab 1 & 2 with actual articles)
  articles.slice(0, 2).forEach((a, i) => {
    if (a.url) setTimeout(() => window.open(a.url, '_blank', 'noopener'), i * 800);
  });
  // Always open market data
  setTimeout(() => window.open(marketUrl, '_blank', 'noopener'), 1800);

} else {
  // Fallback — no API — open the 3 fixed tabs
  const msg =
    `Global briefing — ${time}.\n\n` +
    `Opening three sources for you:\n` +
    `• BBC World News — top global stories\n` +
    `• Reuters — international developments\n` +
    `• TradingView — BTC, S&P 500, major indexes\n\n` +
    `For live AI-summarized headlines, add a NewsAPI key in Settings, ${Mr}.`;

  UI.appendMessage('aria', msg, '◎', 'news-briefing-msg');

  // Spoken summary — natural, JARVIS-style
  SPEECH.say(
    `Global markets are showing movement today, and geopolitical developments are shaping current headlines. ` +
    `I'm opening BBC, Reuters, and live market data now. ` +
    `Would you like me to go deeper into any of these, ${Mr}?`
  );

  // Open tabs with spacing — not too fast, not spammy
  tabsToOpen.forEach((tab, i) => {
    setTimeout(() => window.open(tab.url, '_blank', 'noopener'), i * 900);
  });
}

UI.setAIState('STANDBY', 'standby');
```

},
};

/* ─────────────────────────────────────────────────────────
10. UI — State transitions, rendering, DOM helpers
───────────────────────────────────────────────────────── */
const UI = {

setAIState(label, mode) {
const lbl  = document.getElementById(‘ai-state-label’);
const orb  = document.getElementById(‘dash-core-orb’);
const sym  = document.getElementById(‘dash-core-symbol’);
const dot  = document.getElementById(‘status-dot’);
const wave = document.getElementById(‘waveform’);
const vsb  = document.getElementById(‘vsb-orb’);
const vsbT = document.getElementById(‘vsb-text’);
const badge = document.getElementById(‘core-badge’);

```
if (lbl) lbl.textContent = label;
if (orb) { orb.className = 'dash-core-orb'; if (mode !== 'standby') orb.classList.add(mode); }
if (wave){ wave.className = 'waveform';     if (mode !== 'standby') wave.classList.add('active'); }
if (dot) { dot.className = 'status-dot';    if (mode !== 'standby') dot.classList.add(mode); }
if (vsb) { vsb.className = 'vsb-orb';       if (mode !== 'standby') vsb.classList.add(mode); }
if (badge && mode === 'listening') badge.textContent = 'LISTENING';
else if (badge && mode === 'speaking') badge.textContent = 'SPEAKING';
else if (badge && mode === 'thinking') badge.textContent = 'THINKING';
else if (badge) badge.textContent = 'ACTIVE';

// Toggle body class so CSS can reduce ring clutter during active voice
document.body.classList.toggle('voice-active', STATE.micLoopActive);

const labels = {
  listening: 'Listening…',
  thinking:  'Processing…',
  speaking:  'Speaking…',
  standby:   STATE.micLoopActive ? 'Loop active — speak anytime' : 'Ready',
};
if (vsbT) vsbT.textContent = labels[mode] || 'Ready';
```

},

appendMessage(role, text, avatar, extraClass = ‘’) {
const container = document.getElementById(‘chat-messages’);
const div = document.createElement(‘div’);
div.className = `msg ${role === 'user' ? 'user-msg' : 'aria-msg'} ${extraClass}`.trim();

```
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
```

},

showTyping() {
const container = document.getElementById(‘chat-messages’);
const div = document.createElement(‘div’);
div.className = ‘msg aria-msg’;
div.id = ‘typing-indicator’;
div.innerHTML = `<div class="msg-avatar">◎</div> <div class="msg-content"> <div class="msg-name">ARIA</div> <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div> </div>`;
container.appendChild(div);
container.scrollTop = container.scrollHeight;
},

hideTyping() {
document.getElementById(‘typing-indicator’)?.remove();
},

renderExpenses() {
const list    = document.getElementById(‘expense-list’);
const ovList  = document.getElementById(‘overlay-exp-list’);
const total   = EXPENSE.total();
const topCat  = EXPENSE.topCategory();
const count   = STATE.expenses.length;

```
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
```

},

updateExpenseMetric() {
const total   = EXPENSE.total();
const max     = 500; // Daily budget reference for bar scaling
const pct     = Math.min((total / max) * 100, 100);
const bar     = document.getElementById(‘spend-bar’);
const val     = document.getElementById(‘mv-spend’);
if (bar) bar.style.width = pct + ‘%’;
if (val) val.textContent = `$${total.toFixed(2)}`;
update(‘sb-expense’, `EXPENSES: $${total.toFixed(2)}`);
},

/** Render a single AI agent’s response bubble during multi-agent debate */
appendAgentMessage(providerKey, providerName, icon, color, text) {
const container = document.getElementById(‘chat-messages’);
const div = document.createElement(‘div’);
div.className = ‘msg aria-msg agent-msg’;
div.style.setProperty(’–agent-color’, color);

```
const t = getTime();
const formattedText = text.replace(/\n/g, '<br/>');
div.innerHTML = `
  <div class="msg-avatar agent-avatar" style="border-color:${color};color:${color}">${icon}</div>
  <div class="msg-content">
    <div class="msg-name" style="color:${color}">${providerName.toUpperCase()}</div>
    <div class="msg-bubble agent-bubble" style="border-color:${color}22;background:${color}0a">${formattedText}</div>
    <div class="msg-time">${t}</div>
  </div>
`;
container.appendChild(div);
container.scrollTop = container.scrollHeight;
STATE.msgCount++;
const badge = document.getElementById('msg-count-badge');
if (badge) badge.textContent = `${STATE.msgCount} MSG`;
return div;
```

},
};

// Helper used in UI.updateExpenseMetric
function update(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }

/* ─────────────────────────────────────────────────────────
11b. LEARN — Self-improvement & preference memory
─────────────────────────────────────────────────────────
WHAT THIS DOES (browser-safe, honest):

- Remembers user preferences in localStorage
- Tracks which intents are used most → ARIA gets more specific
- Lets user explicitly teach ARIA (“call me X”, “be briefer”)
- Adapts response speed, tone weight, and address style
- NEVER modifies code automatically
- NEVER claims capabilities it doesn’t have

WHAT IT DOESN’T DO:

- Cannot truly learn or train a model
- Cannot modify its own JS logic
- Improvements are rule-based preference shifts, not ML

HOW TO USE:

- “remember that I prefer short answers”
- “be more formal” / “be less formal”
- “faster responses”
- “stop using my name so much”
- “what have you learned about me”
  ───────────────────────────────────────────────────────── */
  const LEARN = {
  STORAGE_KEY: ‘aria_learn_prefs’,

// Default preferences
defaults: {
responseSpeed:   ‘normal’,   // ‘fast’ | ‘normal’
answerLength:    ‘normal’,   // ‘brief’ | ‘normal’ | ‘detailed’
formalityLevel:  ‘balanced’, // ‘formal’ | ‘balanced’ | ‘casual’
useNameFreq:     ‘sometimes’,// ‘often’ | ‘sometimes’ | ‘rarely’
intentCounts:    {},         // { intentName: count }
totalInteractions: 0,
lastSeen:        null,
userTeachings:   [],         // Raw user preference statements
},

prefs: {},

load() {
try {
const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || ‘{}’);
this.prefs = { …this.defaults, …stored };
} catch {
this.prefs = { …this.defaults };
}
},

save() {
try {
localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.prefs));
} catch { /* storage unavailable */ }
},

/** Record an interaction — updates intent counts and last seen */
record(intent, rawText) {
this.prefs.totalInteractions = (this.prefs.totalInteractions || 0) + 1;
this.prefs.intentCounts[intent] = (this.prefs.intentCounts[intent] || 0) + 1;
this.prefs.lastSeen = new Date().toISOString();
this.save();
},

/** Parse a user teaching command and update preferences accordingly */
teach(text) {
const t = text.toLowerCase();
let changed = false;
let reply = ‘’;

```
if (/brief|shorter|concise|less text|keep it short/.test(t)) {
  this.prefs.answerLength = 'brief';
  reply = `Got it. I'll keep answers short and direct from now on, ${CONFIG.owner.firstName}.`;
  changed = true;
}
else if (/more detail|elaborate|explain more|longer|in depth/.test(t)) {
  this.prefs.answerLength = 'detailed';
  reply = `Understood. I'll give you more thorough answers going forward.`;
  changed = true;
}
else if (/faster|quick|speed up|respond faster/.test(t)) {
  this.prefs.responseSpeed = 'fast';
  reply = `Noted. Faster response timing from here on.`;
  changed = true;
}
else if (/more formal|formal(ly)?/.test(t)) {
  this.prefs.formalityLevel = 'formal';
  reply = `Understood, ${CONFIG.owner.formalName}. I'll maintain a more formal tone.`;
  changed = true;
}
else if (/less formal|casual|relax/.test(t)) {
  this.prefs.formalityLevel = 'casual';
  reply = `Noted. I'll ease up on the formality, ${CONFIG.owner.firstName}.`;
  changed = true;
}
else if (/stop (using|saying) my name|less (name|names)|don't call me/.test(t)) {
  this.prefs.useNameFreq = 'rarely';
  reply = `Understood. I'll use your name much less often.`;
  changed = true;
}
else if (/use my name more|call me (mr|kritesh)/.test(t)) {
  this.prefs.useNameFreq = 'often';
  reply = `Got it. I'll address you more directly, ${CONFIG.owner.formalName}.`;
  changed = true;
}
else if (/what (have you learned|do you know about me)|your preferences|what you know/.test(t)) {
  return this.summarize();
}
else if (/reset (preferences|learning|memory)|forget what you learned/.test(t)) {
  this.prefs = { ...this.defaults };
  this.save();
  return `Preferences reset to defaults. Starting fresh, ${CONFIG.owner.firstName}.`;
}

if (changed) {
  // Store the teaching text for reference
  this.prefs.userTeachings = [...(this.prefs.userTeachings || []).slice(-9), text];
  this.save();
}
return changed ? reply : null;
```

},

/** Generate a summary of what ARIA has learned */
summarize() {
const p  = this.prefs;
const n  = p.totalInteractions || 0;
const topIntents = Object.entries(p.intentCounts || {})
.sort((a,b) => b[1]-a[1])
.slice(0, 3)
.map(([k, v]) => `${k} (${v}x)`)
.join(’, ’) || ‘none yet’;

```
return `Here's what I've stored about your preferences, ${CONFIG.owner.firstName}.\n\n` +
  `Answer length: ${p.answerLength}\n` +
  `Response speed: ${p.responseSpeed}\n` +
  `Formality: ${p.formalityLevel}\n` +
  `Name frequency: ${p.useNameFreq}\n` +
  `Total interactions: ${n}\n` +
  `Most frequent topics: ${topIntents}\n\n` +
  `All of this is stored locally in your browser. Say "reset preferences" to clear it.`;
```

},

/** Apply learned length preference to a reply string */
applyLength(text) {
if (this.prefs.answerLength === ‘brief’) {
// Trim to first 2 sentences for brief mode
const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
return sentences.slice(0, 2).join(’ ’).trim();
}
return text;
},

/** Decide whether to append the user’s name in a given reply */
shouldUseName() {
const freq = this.prefs.useNameFreq || ‘sometimes’;
if (freq === ‘often’)    return Math.random() > 0.3;
if (freq === ‘sometimes’) return Math.random() > 0.6;
if (freq === ‘rarely’)   return Math.random() > 0.88;
return Math.random() > 0.6;
},
};

// ── Load preferences on script init ──
LEARN.load();

/* ─────────────────────────────────────────────────────────
GLOBAL FUNCTIONS — called from HTML event handlers
───────────────────────────────────────────────────────── */

/** Main message send handler — powered by BRAIN multi-agent engine */
async function sendMessage() {
const input = document.getElementById(‘chat-input’);
const text  = input.value.trim();
if (!text || STATE.isThinking) return;
input.value = ‘’;

UI.appendMessage(‘user’, text, CONFIG.owner.initials);
if (CMD.route(text)) return;

if (STATE.currentMode === ‘expense’) {
const parsed = EXPENSE.parse(text);
if (parsed) {
EXPENSE.add(parsed);
ARIA_REPLY(`Added $${parsed.amount.toFixed(2)} for ${parsed.note} (${parsed.category}). Today's total: $${EXPENSE.total().toFixed(2)}.`);
LEARN.record(‘expense’, text);
return;
}
}

STATE.isThinking = true;
UI.setAIState(‘PROCESSING’, ‘thinking’);
UI.showTyping();

const hasRealAI = Object.values(CONFIG.ai.providers).some(p => p.enabled);

if (hasRealAI) {
// ── REAL AI PATH ─────────────────────────────────────
try {
const history = BRAIN.buildHistory(10);
const result  = await BRAIN.think(text, history);

```
  UI.hideTyping();
  STATE.isThinking = false;
  LEARN.record('ai-response', text);

  // Multi-agent: show debate bubbles before synthesis
  if (result.debate?.length > 0 && CONFIG.ai.multiAgent.showDebate) {
    const activeCount = result.debate.length;
    UI.appendMessage('aria',
      `◈ Multi-agent debate — ${activeCount} AI${activeCount > 1 ? "s" : ""} responded:`,
      '◈', 'debate-header'
    );
    result.debate.forEach(d => {
      const p = CONFIG.ai.providers[d.key];
      UI.appendAgentMessage(d.key, p.name, p.icon, p.color, d.reply);
    });
    await new Promise(r => setTimeout(r, 500));
    UI.appendMessage('aria',
      `◎ Synthesis${result.synthesisBy ? " by " + CONFIG.ai.providers[result.synthesisBy]?.name : ""}:`,
      '◎', 'synthesis-header'
    );
  }

  UI.appendMessage('aria', result.final, '◎');

  if (STATE.voiceEnabled) {
    SPEECH.say(result.final);
  } else {
    UI.setAIState('STANDBY', 'standby');
    if (STATE.micLoopActive) setTimeout(() => MIC.startLoop(), 300);
  }

} catch (err) {
  UI.hideTyping();
  STATE.isThinking = false;
  const errText = buildAIErrorMessage(err.message);
  UI.appendMessage('aria', errText, '◎');
  if (STATE.voiceEnabled) SPEECH.say(`Connection issue, ${CONFIG.owner.firstName}. Check the error message.`);
  else UI.setAIState('STANDBY', 'standby');
}
```

} else {
// ── FALLBACK — no real AI, use built-in RESP engine ──
const delay = LEARN.prefs.responseSpeed === ‘fast’
? 300 + Math.random() * 300
: 500 + Math.random() * 600;

```
setTimeout(() => {
  UI.hideTyping();
  STATE.isThinking = false;
  const intent = INTENT.detect(text);
  const reply  = RESP.get(intent, text);
  LEARN.record(intent, text);
  UI.appendMessage('aria', reply, '◎');
  if (STATE.voiceEnabled) {
    SPEECH.say(reply);
  } else {
    UI.setAIState('STANDBY', 'standby');
    if (STATE.micLoopActive) setTimeout(() => MIC.startLoop(), 300);
  }
}, delay);
```

}
}

/** Build friendly error guidance based on what failed */
function buildAIErrorMessage(errMsg) {
const K = CONFIG.owner.formalName;
if (/ollama|localhost|ECONNREFUSED|fetch|network/i.test(errMsg)) {
return `Ollama isn't running, ${K}.\n\nTo fix:\n1. Open a terminal\n2. Run: ollama serve\n3. In another terminal: ollama pull llama3.2\n\nOr enable Gemini or Claude in Settings — both have free tiers.`;
}
if (/api key|401|403/i.test(errMsg)) {
return `API key issue, ${K}. Go to Settings and check the key.\nGemini free: aistudio.google.com\nClaude free: console.anthropic.com`;
}
if (/cors|blocked/i.test(errMsg)) {
return `CORS block on ${CONFIG.ai.activeProvider}, ${K}. Use Ollama (no CORS) or set up a backend proxy. Gemini also works directly from the browser.`;
}
if (/timeout/i.test(errMsg)) {
return `The AI timed out, ${K}. It may be busy — try again.`;
}
return `AI error: ${errMsg}\n\nCheck your provider settings, ${K}.`;
}

/**

- ARIA_REPLY — display a message and speak it.
- Used by CMD router, expense module, and any direct reply path.
- Ensures the continuous mic loop restarts correctly after speaking.
  */
  function ARIA_REPLY(text) {
  UI.hideTyping();
  STATE.isThinking = false; // ← Clear before anything so loop can restart
  UI.appendMessage(‘aria’, text, ‘◎’);

if (STATE.voiceEnabled) {
// SPEECH.say onend will restart mic loop automatically
SPEECH.say(text);
} else {
UI.setAIState(‘STANDBY’, ‘standby’);
// Voice off but loop active — restart mic directly
if (STATE.micLoopActive) setTimeout(() => MIC.startLoop(), 300);
}
}

function handleInputKey(e) { if (e.key === ‘Enter’) sendMessage(); }

/** Mic button — single press starts continuous loop, second press stops */
function toggleMic() {
MIC.toggle();
}

/** Voice output toggle */
function toggleVoice() {
STATE.voiceEnabled = !STATE.voiceEnabled;

const btn = document.getElementById(‘voice-toggle-btn’);
const tog = document.getElementById(‘toggle-voice’);

if (btn) {
btn.style.color       = STATE.voiceEnabled ? ‘var(–cyan)’ : ‘’;
btn.style.borderColor = STATE.voiceEnabled ? ‘var(–cyan)’ : ‘’;
btn.style.boxShadow   = STATE.voiceEnabled ? ‘var(–glow-cyan)’ : ‘’;
}
if (tog) {
tog.classList.toggle(‘on’, STATE.voiceEnabled);
tog.dataset.on = STATE.voiceEnabled.toString();
}

// When disabling voice, also stop mic loop
if (!STATE.voiceEnabled) MIC.stopLoop();

const msg = STATE.voiceEnabled
? `Voice active. I'll speak from here on, ${CONFIG.owner.firstName}.`
: `Voice off. Silent mode.`;
ARIA_REPLY(msg);

update(‘sb-voice-status’, `VOICE: ${STATE.voiceEnabled ? 'ACTIVE' : 'STANDBY'}`);
}

/**

- Hands-free button in the AI Core panel — syncs with the mic loop.
- Pressing this is equivalent to pressing the mic button.
  */
  function toggleContinuousListen() {
  MIC.toggle();
  // Sync the STATE.continuousListen alias for any legacy references
  STATE.continuousListen = STATE.micLoopActive;
  }

/** Mode switcher: chat / expense */
function switchMode(mode) {
STATE.currentMode = mode;
const chatMsgs   = document.getElementById(‘chat-messages’);
const expPanel   = document.getElementById(‘expense-panel’);
const chatBtn    = document.getElementById(‘mode-chat-btn’);
const expBtn     = document.getElementById(‘mode-expense-btn’);
const modeLabel  = document.getElementById(‘vsb-mode-label’);
const sbMode     = document.getElementById(‘sb-mode’);

if (mode === ‘expense’) {
chatMsgs?.classList.add(‘hidden’);
expPanel?.classList.remove(‘hidden’);
chatBtn?.classList.remove(‘active’);
expBtn?.classList.add(‘active’);
if (modeLabel) { modeLabel.textContent = ‘EXPENSE MODE’; modeLabel.classList.add(‘expense-mode’); }
if (sbMode) sbMode.textContent = ‘MODE: EXPENSE’;
UI.renderExpenses();
} else {
chatMsgs?.classList.remove(‘hidden’);
expPanel?.classList.add(‘hidden’);
chatBtn?.classList.add(‘active’);
expBtn?.classList.remove(‘active’);
if (modeLabel) { modeLabel.textContent = ‘CHAT MODE’; modeLabel.classList.remove(‘expense-mode’); }
if (sbMode) sbMode.textContent = ‘MODE: CHAT’;
}
}

/** Expense overlay */
function openExpensePanel() {
document.getElementById(‘expense-overlay’)?.classList.add(‘open’);
UI.renderExpenses();
}
function closeExpensePanel() {
document.getElementById(‘expense-overlay’)?.classList.remove(‘open’);
}
function closeExpenseOverlay(e) {
if (e.target === document.getElementById(‘expense-overlay’)) closeExpensePanel();
}

/** Quick add from overlay input */
function quickAddExpense() {
const input = document.getElementById(‘exp-quick-input’);
const text  = input?.value.trim();
if (!text) return;

const parsed = EXPENSE.parse(text);
if (parsed) {
EXPENSE.add(parsed);
if (input) input.value = ‘’;
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
UI.appendMessage(‘aria’, statement, ‘◎’);
SPEECH.say(`Here's your daily financial statement, ${CONFIG.owner.firstName}.`);
if (document.getElementById(‘expense-overlay’)?.classList.contains(‘open’)) {
closeExpensePanel();
}
switchMode(‘chat’);
}

/** Clear today’s expenses */
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
const container = document.getElementById(‘chat-messages’);
if (container) container.innerHTML = ‘’;
STATE.msgCount = 0;
ARIA_REPLY(`Chat cleared. Fresh session initialized. How may I assist, ${CONFIG.owner.firstName}?`);
}

/** Inject a command from the lexicon panel */
function injectCommand(cmd) {
const input = document.getElementById(‘chat-input’);
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
const nowOn = tog.dataset.on !== ‘true’;
tog.classList.toggle(‘on’, nowOn);
tog.dataset.on = nowOn.toString();

if (key === ‘anim’) {
STATE.animEnabled = nowOn;
document.querySelectorAll(’.d-ring,.ring,.dash-core-pulse,.waveform span’)
.forEach(el => el.style.animationPlayState = nowOn ? ‘running’ : ‘paused’);
}
if (key === ‘scan’) {
const s = document.querySelector(’.scan-line-dash’);
if (s) s.style.display = nowOn ? ‘block’ : ‘none’;
}
if (key === ‘respect’) {
CONFIG.respectfulMode = nowOn;
}
if (key === ‘showdebate’) {
CONFIG.ai.multiAgent.showDebate = nowOn;
}
}

/** Toggle multi-agent debate mode */
function toggleMultiAgent() {
const tog = document.getElementById(‘toggle-multiagent’);
if (!tog) return;
const nowOn = tog.dataset.on !== ‘true’;
tog.classList.toggle(‘on’, nowOn);
tog.dataset.on = nowOn.toString();
CONFIG.ai.multiAgent.enabled = nowOn;

const K = CONFIG.owner.firstName;
if (nowOn) {
const active = Object.entries(CONFIG.ai.providers)
.filter(([, p]) => p.enabled)
.map(([, p]) => p.name);
if (active.length < 2) {
ARIA_REPLY(
`Multi-agent mode is on, ${K}, but only ${active.length || 'no'} provider is currently active. ` +
`Add a Gemini or Claude key in Settings to start the AI debate.`
);
} else {
ARIA_REPLY(
`Multi-agent mode active. ${active.join(', ')} will now debate every response ` +
`and I'll synthesise the best answer for you.`
);
}
} else {
const single = CONFIG.ai.providers[CONFIG.ai.activeProvider]?.name || ‘the built-in engine’;
ARIA_REPLY(`Multi-agent off. Using ${single} only.`);
}
}

/**

- Update the provider status chips and selector in the Settings panel.
- Call this after any key is entered or provider is toggled.
  */
  function updateProviderUI() {
  const providers = [‘ollama’, ‘gemini’, ‘claude’];
  providers.forEach(key => {
  const p    = CONFIG.ai.providers[key];
  const dot  = document.getElementById(`dot-${key}`);
  const chip = document.getElementById(`chip-${key}`);
  if (!dot || !chip) return;
  
  // Provider is “live” if enabled AND has credentials (or Ollama is reachable)
  const live = p.enabled && (key === ‘ollama’ ? p.available : !!p.apiKey);
  dot.style.background  = live ? ‘var(–green)’                  : ‘rgba(255,255,255,0.12)’;
  dot.style.boxShadow   = live ? ‘0 0 8px var(–green)’          : ‘none’;
  chip.style.opacity    = p.enabled ? ‘1’                        : ‘0.45’;
  chip.style.borderColor = live ? p.color + ‘60’                 : ‘rgba(255,255,255,0.07)’;
  });

// Sync the active-provider dropdown to current config
const sel = document.getElementById(‘active-provider-select’);
if (sel) sel.value = CONFIG.ai.activeProvider;

// Update status bar AI label
const multiOn = CONFIG.ai.multiAgent.enabled;
const label   = multiOn
? `AI: MULTI-AGENT`
: `AI: ${(CONFIG.ai.providers[CONFIG.ai.activeProvider]?.name || 'LOCAL').toUpperCase()}`;
update(‘sb-mode’, label);
}

function setHUDIntensity(val) {
const opacity = val / 100;
document.querySelectorAll(’.hud-corner,.dash-hud-corner,.hud-label’)
.forEach(el => el.style.opacity = opacity * 0.8);
}

/* ─────────────────────────────────────────────────────────
TIME / DATE HELPERS
───────────────────────────────────────────────────────── */
function getTime(full = false) {
const now = new Date();
const h = now.getHours().toString().padStart(2,‘0’);
const m = now.getMinutes().toString().padStart(2,‘0’);
const s = now.getSeconds().toString().padStart(2,‘0’);
return full ? `${h}:${m}:${s}` : `${h}:${m}`;
}

function getDate() {
return new Date().toLocaleDateString(‘en-US’, {weekday:‘long’, year:‘numeric’, month:‘long’, day:‘numeric’});
}

function getHour() { return new Date().getHours(); }

function updateStatusBar() {
update(‘sb-time’, getTime(true));
update(‘sb-voice-status’, `VOICE: ${STATE.voiceEnabled ? (STATE.micActive ? 'LISTENING' : 'ACTIVE') : 'STANDBY'}`);
update(‘sb-expense’, `EXPENSES: $${EXPENSE.total().toFixed(2)}`);
}

function updateDateTime() {
const h = getHour();
const period = h < 12 ? ‘morning’ : h < 17 ? ‘afternoon’ : ‘evening’;
update(‘topbar-datetime’, `${getTime()} · ${getDate()}`);
update(‘greeting’, `Good ${period}, ${CONFIG.owner.formalName}.`);
}

function fluctuateMetrics() {
const data = [
{ fill:‘mf-neural’, val:‘mv-neural’, min:55, max:82, unit:’%’  },
{ fill:‘mf-lat’,    val:‘mv-lat’,    min:8,  max:20, unit:‘ms’ },
{ fill:‘mf-mem’,    val:‘mv-mem’,    min:35, max:58, unit:’%’  },
];
data.forEach(d => {
const v = Math.floor(Math.random() * (d.max - d.min) + d.min);
const f = document.getElementById(d.fill);
const n = document.getElementById(d.val);
if (f) f.style.width = v + ‘%’;
if (n) n.textContent = v + d.unit;
});
}

/* ─────────────────────────────────────────────────────────
11. BOOT — Startup sequence & dashboard init
───────────────────────────────────────────────────────── */
window.addEventListener(‘DOMContentLoaded’, () => {
// Start boot clock
const clockEl = document.getElementById(‘startup-clock’);
if (clockEl) setInterval(() => { clockEl.textContent = getTime(true); }, 1000);

// Animate boot progress bar
const fill = document.getElementById(‘boot-progress-fill’);
let pct = 0;
const iv = setInterval(() => {
pct += Math.random() * 7 + 2;
if (pct >= 100) { pct = 100; clearInterval(iv); }
if (fill) fill.style.width = pct + ‘%’;
}, 100);

// Init particle canvas
initStartupCanvas();

// Load saved expenses and learned preferences
EXPENSE.load();
LEARN.load();
});

function enterSystem() {
const startup = document.getElementById(‘startup-screen’);
const dash    = document.getElementById(‘dashboard’);

startup.style.animation = ‘fade-out .8s ease forwards’;
setTimeout(() => {
startup.classList.add(‘hidden’);
dash.classList.remove(‘hidden’);
dash.style.opacity = ‘0’;
dash.style.transition = ‘opacity .8s ease’;
setTimeout(() => { dash.style.opacity = ‘1’; }, 50);

```
initDashCanvas();

// Dashboard ticks
updateDateTime();
setInterval(updateDateTime, 10000);
setInterval(updateStatusBar, 1000);
setInterval(fluctuateMetrics, 3500);

// ── CHECK OLLAMA CONNECTION ───────────────────────────
// Runs silently in background. Updates provider UI chip.
BRAIN.testOllama().then(ok => {
  CONFIG.ai.providers.ollama.available = ok;
  CONFIG.ai.providers.ollama.enabled   = ok;
  updateProviderUI();
  if (ok) {
    // Pre-load model input with current model name
    const modelInput = document.getElementById('ollama-model-input');
    if (modelInput) modelInput.value = CONFIG.ai.providers.ollama.model;
  }
});

// ── AUTO GREETING + NEWS ──────────────────────────────
// Fires automatically on load — no button press required.
// Voice is force-enabled for the greeting sequence only,
// then left in whatever state the user sets.
const Mr = CONFIG.owner.formalName; // "Mr. Kritesh"

setTimeout(() => {
  // Show greeting message in chat
  UI.appendMessage('aria',
    `Welcome back, ${Mr}. Here's what's happening in the world today.`,
    '◎'
  );

  // Force voice on for the greeting (user can turn off later)
  const wasVoiceOn = STATE.voiceEnabled;
  STATE.voiceEnabled = true;
  SPEECH.selectVoice();

  // Speak the greeting
  SPEECH.say(
    `Welcome back, ${Mr}. Here's what's happening in the world today.`
  );

  // Update voice toggle UI to reflect it being on
  const tog = document.getElementById('toggle-voice');
  if (tog) { tog.classList.add('on'); tog.dataset.on = 'true'; }
  const btn = document.getElementById('voice-toggle-btn');
  if (btn) {
    btn.style.color       = 'var(--cyan)';
    btn.style.borderColor = 'var(--cyan)';
    btn.style.boxShadow   = 'var(--glow-cyan)';
  }
  update('sb-voice-status', 'VOICE: ACTIVE');

}, 600);

// ── OPEN 3 TABS after greeting starts ────────────────
// Spacing: 1.2s between each so they don't blast all at once
setTimeout(() => {
  window.open('https://www.bbc.com/news/world',     '_blank', 'noopener'); // Tab 1: BBC World
}, 1400);
setTimeout(() => {
  window.open('https://www.reuters.com/world/',     '_blank', 'noopener'); // Tab 2: Reuters
}, 2400);
setTimeout(() => {
  window.open('https://www.tradingview.com/markets/', '_blank', 'noopener'); // Tab 3: Markets (BTC, S&P)
}, 3400);

// ── Spoken market summary after tabs open ─────────────
setTimeout(() => {
  UI.appendMessage('aria',
    `Global markets are showing movement today, and geopolitical developments are shaping current headlines.\n\nBBC World News, Reuters, and live market data are now open.\n\nWould you like me to go deeper into any of these, ${Mr}?`,
    '◎'
  );
  SPEECH.say(
    `Global markets are showing movement today, and geopolitical developments are shaping current headlines. ` +
    `Would you like me to go deeper into any of these, ${Mr}?`
  );
}, 4000);

// Render initial expense state
UI.renderExpenses();
UI.updateExpenseMetric();
```

}, 800);
}

/* ─────────────────────────────────────────────────────────
CANVAS — Startup particles
───────────────────────────────────────────────────────── */
function initStartupCanvas() {
const canvas = document.getElementById(‘startup-canvas’);
if (!canvas) return;
const ctx = canvas.getContext(‘2d’);
let W, H, particles = [];

function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener(‘resize’, resize);

function Particle() {
this.x = Math.random() * W; this.y = Math.random() * H;
this.vx = (Math.random()-.5)*.4; this.vy = (Math.random()-.5)*.4;
this.r = Math.random()*1.5+.4; this.a = Math.random()*.4+.05;
this.color = Math.random()>.5 ? ‘0,180,255’ : ‘0,255,247’;
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
const canvas = document.getElementById(‘dash-canvas’);
if (!canvas) return;
const ctx = canvas.getContext(‘2d’);
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
for (let i=0;i<50;i++) drifters.push({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25, r:Math.random()*1.2+.3, a:Math.random()*.18+.04, color:Math.random()>.6?‘0,255,247’:Math.random()>.3?‘0,180,255’:‘176,96,255’ });
}
resize();
window.addEventListener(‘resize’, resize);

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
g.addColorStop(0,`rgba(0,180,255,.012)`); g.addColorStop(1,‘transparent’);
ctx.beginPath(); ctx.arc(x,y,220,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
}
requestAnimationFrame(tick);
}
tick();
}

/* ─────────────────────────────────────────────────────────
KEYBOARD SHORTCUTS
───────────────────────────────────────────────────────── */
document.addEventListener(‘keydown’, e => {
if (e.ctrlKey || e.metaKey) {
if (e.key === ‘k’) { e.preventDefault(); document.getElementById(‘chat-input’)?.focus(); }
if (e.key === ‘m’) { e.preventDefault(); MIC.toggle(); }
if (e.key === ‘e’) { e.preventDefault(); openExpensePanel(); }
if (e.key === ‘n’) { e.preventDefault(); triggerNewsBriefing(); }
}
if (e.key === ‘Escape’) {
MIC.stopLoop();
STATE.continuousListen = false;
closeExpensePanel();
}
});
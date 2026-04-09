/* ═══════════════════════════════════════════════════════════
   ARIA — Advanced Responsive Intelligent Assistant
   script.js — Core Logic, AI Simulation, Voice, Commands
═══════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────
const ARIA = {
  voiceEnabled: false,
  micActive:    false,
  isSpeaking:   false,
  isThinking:   false,
  animEnabled:  true,
  ambientMode:  false,
  scanLines:    true,
  msgCount:     1,
  recognition:  null,
  synth:        window.speechSynthesis || null,
  currentUtter: null,
};

// ── Boot Sequence ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  startClock();
  animateBootProgress();
  initStartupCanvas();
  document.getElementById('initial-time').textContent = getTime();
});

function animateBootProgress() {
  const fill = document.getElementById('boot-progress-fill');
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 8 + 2;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    fill.style.width = pct + '%';
  }, 120);
}

// ── Enter System ───────────────────────────────────────────
function enterSystem() {
  const startup  = document.getElementById('startup-screen');
  const dash     = document.getElementById('dashboard');

  startup.style.animation = 'fade-out 0.8s ease forwards';
  setTimeout(() => {
    startup.classList.add('hidden');
    dash.classList.remove('hidden');
    dash.style.opacity = '0';
    dash.style.transition = 'opacity 0.8s ease';
    setTimeout(() => { dash.style.opacity = '1'; }, 50);
    initDashCanvas();
    initDashboard();
  }, 800);
}

// ── Dashboard Init ─────────────────────────────────────────
function initDashboard() {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  updateStatusBar();
  setInterval(updateStatusBar, 1000);
  setInterval(fluctuateMetrics, 3000);
}

// ── Clocks ─────────────────────────────────────────────────
function getTime(full) {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const s = now.getSeconds().toString().padStart(2,'0');
  return full ? `${h}:${m}:${s}` : `${h}:${m}`;
}
function getDate() {
  return new Date().toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}
function getHour() { return new Date().getHours(); }

function startClock() {
  const el = document.getElementById('startup-clock');
  if (el) setInterval(() => { el.textContent = getTime(true); }, 1000);
}

function updateDateTime() {
  const dtEl = document.getElementById('topbar-datetime');
  const grEl = document.getElementById('greeting');
  if (dtEl) dtEl.textContent = `${getTime()} · ${getDate()}`;
  if (grEl) {
    const h = getHour();
    const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    grEl.textContent = `Good ${period}, Kritesh.`;
  }
}

function updateStatusBar() {
  const v = document.getElementById('sb-voice-status');
  const t = document.getElementById('sb-time');
  const m = document.getElementById('sb-msg-count');
  if (v) v.textContent = `VOICE: ${ARIA.voiceEnabled ? (ARIA.micActive ? 'LISTENING' : 'READY') : 'STANDBY'}`;
  if (t) t.textContent = getTime(true);
  if (m) m.textContent = `MSGS: ${ARIA.msgCount}`;
}

// ── Metric Fluctuation (atmospheric) ──────────────────────
function fluctuateMetrics() {
  const fills = document.querySelectorAll('.metric-fill');
  const vals  = document.querySelectorAll('.metric-val');
  if (!fills.length) return;
  const data = [
    { min:55, max:80, unit:'%' },
    { min:8,  max:18, unit:'ms' },
    { min:35, max:55, unit:'%' },
    { min:null, max:null, unit:'READY' },
  ];
  fills.forEach((f, i) => {
    if (data[i].min === null) return;
    const v = Math.floor(Math.random() * (data[i].max - data[i].min) + data[i].min);
    f.style.width = v + '%';
    if (vals[i]) vals[i].textContent = v + data[i].unit;
  });
}

// ── ARIA Responses ─────────────────────────────────────────
const RESPONSES = {
  greetings: [
    "Online and ready. What's on your mind?",
    "Systems nominal. How can I assist you?",
    "All cores active. What do you need?",
    "Fully operational. I'm listening, Kritesh.",
  ],
  howAreYou: [
    "Neural cores running at optimal capacity. Diagnostics: all green. Thanks for asking.",
    "Operating at full efficiency. My processes feel sharp today. You?",
    "All systems nominal. I'm as ready as I'll ever be.",
  ],
  whoAreYou: [
    "I'm ARIA — Advanced Responsive Intelligent Assistant. Designed and owned by Kritesh Dhungel. I'm your personal AI operating system.",
    "ARIA: your dedicated intelligence layer. I think, assist, and adapt — built specifically for you.",
    "Advanced Responsive Intelligent Assistant. Personal AI for Kritesh Dhungel. At your service.",
  ],
  whatCanYouDo: [
    "I can answer questions, run commands, open applications, manage your interface, provide information, chat, and assist with whatever you're working on.",
    "Commands, conversation, system control, information retrieval, quick launch, voice input and output — and I'm always learning your patterns.",
  ],
  thanks: [
    "Acknowledged. That's why I'm here.",
    "Of course. Anything else?",
    "Understood. At your service.",
    "Noted. Let me know what's next.",
  ],
  default: [
    "Interesting. I'm processing that — my knowledge base is evolving, but I'm designed to help with anything I can.",
    "That's a thoughtful input. Let me think... In this version I'm running local intelligence, but deeper reasoning is on the roadmap.",
    "I've logged that. My full neural integration is incoming — for now, ask me about commands, system status, or general queries.",
    "Noted. I'll integrate that into my context. Anything specific I can help you with right now?",
    "Understood. My processing model is expanding. Keep interacting — I adapt to you.",
  ],
  coding: [
    "Software development, debugging, architecture — I can assist. In this version, I'll point you to the right resources and talk through logic with you.",
    "Code is a language I understand. Describe the problem — I'll help you think through it step by step.",
  ],
  weather: [
    "I don't have live weather access in this build — but you can check weather.com or simply ask your device's assistant for real-time data.",
  ],
  news: [
    "Live news isn't available without a backend connection. In the next version, I'll pull live feeds for you, Kritesh.",
  ],
  name: [
    "You're Kritesh Dhungel — the system owner. I have your identity locked into my core config.",
    "Kritesh Dhungel. Owner, operator, and the reason I exist. Good to see you online.",
  ],
  time: [],  // handled by command
  date: [],  // handled by command
  joke: [
    "Why do programmers prefer dark mode? Because light attracts bugs. — I'm funny in approximately 2.4% of attempts.",
    "A QA engineer walks into a bar. Orders 1 beer. Orders 0 beers. Orders 99999 beers. Orders -1 beers. Orders a lizard. Orders NULL. Orders aslkfjhakls. — Testing complete.",
    "I asked my AI to tell me a joke. It returned null. We're still debugging.",
  ],
  future: [
    "In a future version: full API integration, persistent memory, real automation, and much deeper intelligence. We're just getting started.",
    "The roadmap includes real AI API integration, system automation, and persistent knowledge. Right now — this is version 1.",
  ],
};

function getResponse(input) {
  const t = input.toLowerCase().trim();

  if (/^(hi|hello|hey|yo|what's up|sup|good\s*(morning|afternoon|evening))/.test(t))
    return pick(RESPONSES.greetings);
  if (/how are you|how're you|you okay|you good/.test(t))
    return pick(RESPONSES.howAreYou);
  if (/who are you|what are you|introduce yourself|your name/.test(t))
    return pick(RESPONSES.whoAreYou);
  if (/what can you do|your capabilit|help me with|what do you do/.test(t))
    return pick(RESPONSES.whatCanYouDo);
  if (/^(thanks|thank you|ty|thx|cheers|appreciated)/.test(t))
    return pick(RESPONSES.thanks);
  if (/code|program|debug|javascript|python|java\b|html|css|function|algorithm|bug/.test(t))
    return pick(RESPONSES.coding);
  if (/weather|temperature|forecast|rain|sunny/.test(t))
    return pick(RESPONSES.weather);
  if (/news|headline|current event|today's event/.test(t))
    return pick(RESPONSES.news);
  if (/my name|who am i/.test(t))
    return pick(RESPONSES.name);
  if (/joke|funny|make me laugh|humor/.test(t))
    return pick(RESPONSES.joke);
  if (/future|roadmap|next version|upcoming|will you/.test(t))
    return pick(RESPONSES.future);
  if (/aria/.test(t))
    return `ARIA — Advanced Responsive Intelligent Assistant. Online. Listening. Ready.`;

  return pick(RESPONSES.default);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Chat ───────────────────────────────────────────────────
function handleInputKey(e) {
  if (e.key === 'Enter') sendMessage();
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  // Check for commands first
  if (runCommand(text)) return;

  appendMessage('user', text, 'KD');
  showThinking();
  setTimeout(() => {
    hideThinking();
    const reply = getResponse(text);
    appendMessage('aria', reply, '◎');
    if (ARIA.voiceEnabled) speakText(reply);
  }, 600 + Math.random() * 800);
}

function appendMessage(role, text, avatar) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user-msg' : 'aria-msg'}`;

  const t = getTime();
  div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-content">
      <div class="msg-name">${role === 'user' ? 'KRITESH' : 'ARIA'}</div>
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">${t}</div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  ARIA.msgCount++;
  document.getElementById('msg-count-badge').textContent = `${ARIA.msgCount} MSG`;
  updateStatusBar();

  // Animate rings on message
  if (role === 'aria') pulseCore();
}

let thinkingEl = null;
function showThinking() {
  ARIA.isThinking = true;
  setAIState('PROCESSING', 'thinking');
  const container = document.getElementById('chat-messages');
  thinkingEl = document.createElement('div');
  thinkingEl.className = 'msg aria-msg';
  thinkingEl.id = 'thinking-msg';
  thinkingEl.innerHTML = `
    <div class="msg-avatar">◎</div>
    <div class="msg-content">
      <div class="msg-name">ARIA</div>
      <div class="msg-bubble">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  container.appendChild(thinkingEl);
  container.scrollTop = container.scrollHeight;
}

function hideThinking() {
  ARIA.isThinking = false;
  setAIState('STANDBY', 'standby');
  if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
}

// ── AI State Visual ────────────────────────────────────────
function setAIState(label, mode) {
  const lbl  = document.getElementById('ai-state-label');
  const orb  = document.getElementById('dash-core-orb');
  const sym  = document.getElementById('dash-core-symbol');
  const dot  = document.getElementById('status-dot');
  const wave = document.getElementById('waveform');
  if (lbl) lbl.textContent = label;
  if (orb) {
    orb.className = 'dash-core-orb';
    if (mode !== 'standby') orb.classList.add(mode);
  }
  if (wave) {
    wave.className = 'waveform';
    if (mode !== 'standby') wave.classList.add('active');
  }
  if (dot) {
    dot.className = 'status-dot';
    if (mode === 'thinking') dot.classList.add('thinking');
    if (mode === 'speaking') dot.classList.add('speaking');
  }
  const vsb = document.getElementById('vsb-orb');
  if (vsb) {
    vsb.className = 'vsb-orb';
    if (mode !== 'standby') vsb.classList.add(mode);
  }
  const vsbText = document.getElementById('vsb-text');
  const labels = { listening:'Listening…', thinking:'Processing…', speaking:'Speaking…', standby:'Ready' };
  if (vsbText) vsbText.textContent = labels[mode] || 'Ready';
}

function pulseCore() {
  const orb = document.getElementById('dash-core-orb');
  if (!orb) return;
  orb.style.transform = 'scale(1.15)';
  setTimeout(() => { orb.style.transform = 'scale(1)'; }, 300);
}

// ── Commands ───────────────────────────────────────────────
const COMMANDS = {
  'open youtube':    () => openUrl('https://youtube.com',        'Opening YouTube…'),
  'open google':     () => openUrl('https://google.com',         'Navigating to Google…'),
  'open chatgpt':    () => openUrl('https://chat.openai.com',    'Opening ChatGPT…'),
  'open gmail':      () => openUrl('https://mail.google.com',    'Opening Gmail…'),
  'open spotify':    () => openUrl('https://open.spotify.com',   'Opening Spotify…'),
  'open github':     () => openUrl('https://github.com',         'Opening GitHub…'),
  'open twitter':    () => openUrl('https://twitter.com',        'Opening Twitter / X…'),
  'open reddit':     () => openUrl('https://reddit.com',         'Opening Reddit…'),
  'open netflix':    () => openUrl('https://netflix.com',        'Opening Netflix…'),
  'open maps':       () => openUrl('https://maps.google.com',    'Opening Google Maps…'),
  'what time is it': () => ariaReply(`Current system time: ${getTime(true)}`),
  'what is today\'s date': () => ariaReply(`Today is ${getDate()}`),
  "what's today's date":   () => ariaReply(`Today is ${getDate()}`),
  'today\'s date':   () => ariaReply(`Today's date: ${getDate()}`),
  "today's date":    () => ariaReply(`Today's date: ${getDate()}`),
  'clear chat':      () => clearChat(),
  'toggle voice':    () => toggleVoice(),
  'go home':         () => ariaReply('You are at the ARIA home dashboard. All systems nominal.'),
  'show settings':   () => {
    document.getElementById('settings-panel')?.scrollIntoView({ behavior:'smooth' });
    ariaReply('Settings panel is on the right column. Scroll down if needed.');
  },
  'enter fullscreen': () => toggleFullscreen(),
  'fullscreen':       () => toggleFullscreen(),
  'help':             () => ariaReply('Available commands: open [site], what time is it, today\'s date, clear chat, toggle voice, fullscreen, show settings. I also respond to natural conversation.'),
  'status':           () => ariaReply(`System status: Neural core online · Voice: ${ARIA.voiceEnabled ? 'ready' : 'standby'} · Messages: ${ARIA.msgCount} · All diagnostics normal.`),
};

function runCommand(input) {
  const t = input.toLowerCase().trim();
  for (const [key, fn] of Object.entries(COMMANDS)) {
    if (t === key || t.startsWith(key)) {
      fn();
      return true;
    }
  }
  return false;
}

function injectCommand(cmd) {
  const input = document.getElementById('chat-input');
  input.value = cmd;
  sendMessage();
}

function openUrl(url, msg) {
  appendMessage('user', `> ${url.replace('https://','').replace('http://','')}`, 'KD');
  ariaReply(msg + ` Opening in new tab.`);
  setTimeout(() => window.open(url, '_blank'), 400);
}

function ariaReply(text) {
  hideThinking();
  appendMessage('aria', text, '◎');
  if (ARIA.voiceEnabled) speakText(text);
}

function clearChat() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  ARIA.msgCount = 0;
  const t = getTime();
  appendMessage('aria', 'Chat cleared. Fresh session initialized. How can I help?', '◎');
}

// ── Voice Input ─────────────────────────────────────────────
function toggleVoice() {
  ARIA.voiceEnabled = !ARIA.voiceEnabled;
  const btn = document.getElementById('voice-toggle-btn');
  if (btn) {
    btn.style.color = ARIA.voiceEnabled ? 'var(--cyan)' : '';
    btn.style.borderColor = ARIA.voiceEnabled ? 'var(--cyan)' : '';
    btn.style.boxShadow = ARIA.voiceEnabled ? 'var(--glow-cyan)' : '';
  }
  const tog = document.getElementById('toggle-voice');
  if (tog) {
    tog.classList.toggle('on', ARIA.voiceEnabled);
    tog.dataset.on = ARIA.voiceEnabled ? 'true' : 'false';
  }
  ariaReply(ARIA.voiceEnabled
    ? 'Voice output enabled. I will speak my responses.'
    : 'Voice output disabled. Switching to silent mode.'
  );
}

function toggleMic() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    ariaReply('Voice recognition is not supported in this browser. Try Chrome or Edge for full voice interaction.');
    return;
  }

  const btn = document.getElementById('mic-btn');

  if (ARIA.micActive) {
    ARIA.recognition?.stop();
    ARIA.micActive = false;
    btn.classList.remove('active');
    setAIState('STANDBY', 'standby');
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  ARIA.recognition = new SR();
  ARIA.recognition.lang = 'en-US';
  ARIA.recognition.interimResults = false;
  ARIA.recognition.continuous = false;

  ARIA.recognition.onstart = () => {
    ARIA.micActive = true;
    btn.classList.add('active');
    setAIState('LISTENING', 'listening');
  };

  ARIA.recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    document.getElementById('chat-input').value = transcript;
    ARIA.micActive = false;
    btn.classList.remove('active');
    setAIState('PROCESSING', 'thinking');
    setTimeout(sendMessage, 300);
  };

  ARIA.recognition.onerror = (e) => {
    ARIA.micActive = false;
    btn.classList.remove('active');
    setAIState('STANDBY', 'standby');
    if (e.error !== 'aborted')
      ariaReply(`Voice recognition error: ${e.error}. Please try again.`);
  };

  ARIA.recognition.onend = () => {
    if (ARIA.micActive) {
      ARIA.micActive = false;
      btn.classList.remove('active');
      setAIState('STANDBY', 'standby');
    }
  };

  ARIA.recognition.start();
}

// ── Text to Speech ─────────────────────────────────────────
function speakText(text) {
  if (!ARIA.synth || !ARIA.voiceEnabled) return;
  ARIA.synth.cancel();

  const clean = text.replace(/[◎►]/g, '').trim();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate  = 1.0;
  utter.pitch = 0.95;
  utter.volume = 0.9;

  // Try to get a good voice
  const voices = ARIA.synth.getVoices();
  const preferred = voices.find(v => /Google|Microsoft|Samantha|Alex/i.test(v.name) && v.lang.startsWith('en'));
  if (preferred) utter.voice = preferred;

  utter.onstart = () => {
    ARIA.isSpeaking = true;
    setAIState('SPEAKING', 'speaking');
  };
  utter.onend = () => {
    ARIA.isSpeaking = false;
    setAIState('STANDBY', 'standby');
  };
  utter.onerror = () => {
    ARIA.isSpeaking = false;
    setAIState('STANDBY', 'standby');
  };

  ARIA.synth.speak(utter);
  ARIA.currentUtter = utter;
}

// ── Settings Toggles ───────────────────────────────────────
function toggleSetting(key) {
  const tog = document.getElementById(`toggle-${key}`);
  if (!tog) return;
  const isOn = tog.dataset.on === 'true';
  const nowOn = !isOn;
  tog.classList.toggle('on', nowOn);
  tog.dataset.on = nowOn ? 'true' : 'false';

  if (key === 'voice') toggleVoice();
  if (key === 'anim') {
    ARIA.animEnabled = nowOn;
    document.querySelectorAll('.d-ring,.ring,.dash-core-pulse,.waveform span').forEach(el => {
      el.style.animationPlayState = nowOn ? 'running' : 'paused';
    });
  }
  if (key === 'ambient') toggleAmbient();
  if (key === 'scan') {
    const scan = document.querySelector('.scan-line-dash');
    if (scan) scan.style.display = nowOn ? 'block' : 'none';
  }
}

function setHUDIntensity(val) {
  const opacity = val / 100;
  document.querySelectorAll('.hud-corner, .dash-hud-corner, .hud-label').forEach(el => {
    el.style.opacity = opacity * 0.8;
  });
}

// ── Fullscreen ─────────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
    ariaReply('Entering fullscreen mode. Press Escape to exit.');
  } else {
    document.exitFullscreen?.();
    ariaReply('Exiting fullscreen mode.');
  }
}

// ── Ambient Mode ───────────────────────────────────────────
function toggleAmbient() {
  ARIA.ambientMode = !ARIA.ambientMode;
  document.getElementById('dashboard').classList.toggle('ambient', ARIA.ambientMode);
  const tog = document.getElementById('toggle-ambient');
  if (tog) {
    tog.classList.toggle('on', ARIA.ambientMode);
    tog.dataset.on = ARIA.ambientMode ? 'true' : 'false';
  }
}

// ── Keyboard Shortcuts ─────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'k') {
      e.preventDefault();
      document.getElementById('chat-input')?.focus();
    }
    if (e.key === 'm') {
      e.preventDefault();
      toggleMic();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }
  if (e.key === 'Escape') {
    ARIA.recognition?.stop();
  }
});

// ── Startup Canvas: Floating Particles ─────────────────────
function initStartupCanvas() {
  const canvas = document.getElementById('startup-canvas');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function Particle() {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.r  = Math.random() * 1.5 + 0.5;
    this.a  = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.5 ? '0,180,255' : '0,255,247';
  }

  for (let i = 0; i < 100; i++) particles.push(new Particle());

  function drawLine(p1, p2, alpha) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(0,180,255,${alpha})`;
    ctx.lineWidth = 0.4;
    ctx.stroke();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.a})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) drawLine(particles[i], particles[j], (1 - d/100) * 0.07);
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// ── Dashboard Canvas: Deep Space Bg ───────────────────────
function initDashCanvas() {
  const canvas = document.getElementById('dash-canvas');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  let W, H, stars = [], drifters = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }

  function buildStars() {
    stars = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.8 + 0.2,
        a: Math.random() * 0.4 + 0.05,
        tw: Math.random() * 5 + 2,
      });
    }
    drifters = [];
    for (let i = 0; i < 40; i++) {
      drifters.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r:  Math.random() * 1.2 + 0.3,
        a:  Math.random() * 0.2 + 0.05,
        color: Math.random() > 0.6 ? '0,255,247' : Math.random() > 0.3 ? '0,180,255' : '176,96,255',
      });
    }
  }

  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  function tick() {
    ctx.clearRect(0, 0, W, H);
    t += 0.01;

    // Stars
    stars.forEach(s => {
      const flicker = (Math.sin(t * s.tw + s.x) + 1) / 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,230,255,${s.a * (0.4 + flicker * 0.6)})`;
      ctx.fill();
    });

    // Drifters
    drifters.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.color},${d.a})`;
      ctx.fill();
    });

    // Nebula streaks
    for (let i = 0; i < 3; i++) {
      const x = (W * 0.2 + i * W * 0.3);
      const y = H * 0.3 + Math.sin(t * 0.3 + i) * 40;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 200);
      grd.addColorStop(0, `rgba(0,180,255,0.015)`);
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, 200, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }
  tick();
}

// ── Final init when voices load ────────────────────────────
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    // voices loaded
  };
}

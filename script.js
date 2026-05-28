/*
  ARIA SYSTEM v4 — script.js
  Created by Kritesh Dhungel © 2025
  Unauthorized copying, resale, or redistribution prohibited.
*/

'use strict';

/* ═══════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════ */
const CONFIG = {
  PIN:         '0002',
  BACKEND:     'http://localhost:3000',
  USER:        'Mr. Kritesh',
  STAY:        true,
};

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const S = {
  authenticated: false,
  pin: '',
  backendOnline: false,
  backendUrl: CONFIG.BACKEND,
  model: 'openai',
  debateOn: true,
  chat: [],
  userName: CONFIG.USER,
  debating: false,
  fallbackMode: false,
  voiceActive: false,
  recognition: null,
  synth: window.speechSynthesis || null,
};

const LS = {
  AUTH:'aria_auth', CHAT:'aria_chat', BACK:'aria_back',
  MODEL:'aria_model', USER:'aria_user', STAY:'aria_stay',
};

const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelector(sel);

/* ═══════════════════════════════════════════
   LOCAL FALLBACK ENGINE
   Works without ANY backend or API key
═══════════════════════════════════════════ */
const FALLBACK = {

  // Math evaluator — handles 1+1, 10*5, 50% of 200, etc.
  math(input) {
    const t = input.toLowerCase().trim();

    // Percentage of: "X% of Y"
    const pctOf = t.match(/(\d+\.?\d*)\s*%\s*of\s*(\d+\.?\d*)/);
    if (pctOf) {
      const result = (parseFloat(pctOf[1]) / 100) * parseFloat(pctOf[2]);
      return `${pctOf[1]}% of ${pctOf[2]} = **${result}**`;
    }

    // Percentage: "what is X% of Y"
    const pctQ = t.match(/what\s+is\s+(\d+\.?\d*)\s*%\s*of\s*(\d+\.?\d*)/);
    if (pctQ) {
      const result = (parseFloat(pctQ[1]) / 100) * parseFloat(pctQ[2]);
      return `${pctQ[1]}% of ${pctQ[2]} = **${result}**`;
    }

    // Unit conversions
    const km2mi = t.match(/(\d+\.?\d*)\s*km?\s*to\s*mi/);
    if (km2mi) return `${km2mi[1]} km = **${(parseFloat(km2mi[1]) * 0.6214).toFixed(3)} miles**`;

    const mi2km = t.match(/(\d+\.?\d*)\s*mi(?:les?)?\s*to\s*km/);
    if (mi2km) return `${mi2km[1]} miles = **${(parseFloat(mi2km[1]) * 1.6093).toFixed(3)} km**`;

    const kg2lb = t.match(/(\d+\.?\d*)\s*kg\s*to\s*l(?:b|bs)/);
    if (kg2lb) return `${kg2lb[1]} kg = **${(parseFloat(kg2lb[1]) * 2.2046).toFixed(3)} lbs**`;

    const c2f = t.match(/(\-?\d+\.?\d*)\s*c\s*to\s*f/);
    if (c2f) return `${c2f[1]}°C = **${((parseFloat(c2f[1]) * 9/5) + 32).toFixed(1)}°F**`;

    const f2c = t.match(/(\-?\d+\.?\d*)\s*f\s*to\s*c/);
    if (f2c) return `${f2c[1]}°F = **${((parseFloat(f2c[1]) - 32) * 5/9).toFixed(1)}°C**`;

    // Safe math eval — only digits and operators
    const expr = input.replace(/[^0-9+\-*/().% \t]/g, '').trim();
    if (/^[\d\s+\-*/().%]+$/.test(expr) && expr.length > 0) {
      try {
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')();
        if (typeof result === 'number' && isFinite(result)) {
          return `${expr.trim()} = **${result % 1 === 0 ? result : result.toFixed(4)}**`;
        }
      } catch { /* not math */ }
    }
    return null;
  },

  // Command handler — built-in commands work offline
  command(input) {
    const t = input.toLowerCase().trim();

    // Time / Date
    if (/what(\s+is|\s+'s)?\s+the\s+time|current\s+time|what\s+time\s+is\s+it/.test(t)) {
      return `Current time: **${new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}**`;
    }
    if (/today'?s?\s+date|what\s+day\s+is|current\s+date/.test(t)) {
      return `Today is **${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}**`;
    }

    // Open websites
    const siteMap = {
      youtube:'https://youtube.com', google:'https://google.com',
      gmail:'https://mail.google.com', github:'https://github.com',
      reddit:'https://reddit.com', spotify:'https://open.spotify.com',
      netflix:'https://netflix.com', twitter:'https://x.com',
      x:'https://x.com', instagram:'https://instagram.com',
      amazon:'https://amazon.com', chatgpt:'https://chat.openai.com',
    };
    for (const [name, url] of Object.entries(siteMap)) {
      if (new RegExp(`(open|launch|go to|navigate to)\\s+${name}`, 'i').test(t)) {
        window.open(url, '_blank');
        return `Opening **${name.charAt(0).toUpperCase()+name.slice(1)}** in a new tab.`;
      }
    }

    // Search
    const ytSearch = t.match(/(?:search\s+youtube|youtube\s+search)\s+(?:for\s+)?(.+)/);
    if (ytSearch) {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(ytSearch[1])}`, '_blank');
      return `Searching YouTube for **"${ytSearch[1]}"**.`;
    }
    const gSearch = t.match(/(?:search\s+google|google\s+search|search\s+for|search)\s+(.+)/);
    if (gSearch) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(gSearch[1])}`, '_blank');
      return `Searching Google for **"${gSearch[1]}"**.`;
    }

    // Clear
    if (/^(clear\s+chat|reset\s+chat|clear)$/.test(t)) { clearChat(); return null; }

    // Voice
    if (/^(start\s+voice|voice\s+mode|listen)/.test(t)) { startVoice(); return 'Voice mode activated. Listening…'; }
    if (/^(stop\s+voice|quiet|mute)/.test(t)) { stopVoice(); return 'Voice mode off.'; }

    return null;
  },

  // General fallback replies when nothing else works
  reply(input) {
    const t = input.toLowerCase();
    const h = new Date().getHours();
    const period = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';

    if (/^(hi|hello|hey|sup|yo)\b/.test(t))
      return `Good ${period}, ${S.userName}. ARIA is running in local mode — cloud AI unavailable. Math, commands, and quick tasks still work.`;

    if (/how are you|how('?re| are) you doing/.test(t))
      return `Systems nominal. Running in local fallback mode — no cloud AI right now, but I can handle math, unit conversions, web commands, and basic tasks.`;

    if (/what can you do|help/.test(t))
      return `In local fallback mode I can:\n• Math — 1+1, 50% of 200, etc.\n• Conversions — km to miles, °C to °F, kg to lbs\n• Open websites — "open YouTube"\n• Search — "search Google for X"\n• Time & date — "what time is it"\n\nFor full AI responses, connect backend with valid API keys.`;

    if (/1\s*\+\s*1|one plus one/.test(t)) return '1 + 1 = **2**';

    return `I'm in local fallback mode — cloud AI is unavailable or limit reached. I can still handle math, conversions, and web commands.\n\nTry: "open YouTube", "what time is it", "100 * 3.14", or "20% of 500".`;
  },

  // Master handler
  handle(input) {
    const cmd = this.command(input);
    if (cmd !== null) return cmd;

    const math = this.math(input);
    if (math !== null) return `📐 ${math}`;

    return this.reply(input);
  },
};

/* ═══════════════════════════════════════════
   BOOT SCREEN
═══════════════════════════════════════════ */
let bootCanvas, bootCtx, bootParticles = [];

function initBootCanvas() {
  bootCanvas = $('boot-canvas');
  if (!bootCanvas) return;
  bootCtx = bootCanvas.getContext('2d');
  bootCanvas.width  = window.innerWidth;
  bootCanvas.height = window.innerHeight;
  for (let i = 0; i < 60; i++) bootParticles.push(newBP());
  renderBoot();
}

function newBP() {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random() * 0.4 + 0.1,
  };
}

function renderBoot() {
  if (!bootCtx) return;
  const W = bootCanvas.width, H = bootCanvas.height;
  bootCtx.clearRect(0, 0, W, H);
  bootParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    bootCtx.beginPath();
    bootCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bootCtx.fillStyle = `rgba(255,45,59,${p.a * 0.5})`;
    bootCtx.fill();
  });
  if ($('boot').classList.contains('active')) requestAnimationFrame(renderBoot);
}

const BOOT_MSGS = [
  'INITIALIZING ARIA CORE SYSTEMS',
  'LOADING MULTI-MODEL DEBATE ENGINE',
  'CALIBRATING AI AGENTS',
  'CONNECTING FALLBACK LAYER',
  'NEURAL NETWORK ONLINE',
];

async function runBoot() {
  initBootCanvas();
  const bar   = $('boot-bar');
  const pct   = $('boot-pct');
  const logs  = $('boot-logs');

  for (let i = 0; i < BOOT_MSGS.length; i++) {
    await sleep(i === 0 ? 300 : 380 + Math.random() * 220);
    const progress = ((i + 1) / BOOT_MSGS.length) * 100;
    bar.style.width = progress + '%';
    pct.textContent = Math.round(progress) + '%';

    // Update log lines
    const line = document.createElement('div');
    line.className = 'boot-log-line';
    line.textContent = '▸ ' + BOOT_MSGS[i];
    logs.appendChild(line);
    // Mark previous done
    [...logs.children].forEach((el, idx) => {
      el.className = 'boot-log-line ' + (idx === logs.children.length - 1 ? 'active' : 'done');
    });
  }

  await sleep(600);
  loadSettings();

  const stayIn = localStorage.getItem(LS.STAY) !== 'false';
  if (localStorage.getItem(LS.AUTH) === 'true' && stayIn) {
    S.authenticated = true;
    transition('boot', 'conn-screen');
    runConnect();
  } else {
    transition('boot', 'pin-screen');
    initPinCanvas();
  }
}

/* ═══════════════════════════════════════════
   PIN CANVAS
═══════════════════════════════════════════ */
function initPinCanvas() {
  const c = $('pin-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width  = window.innerWidth;
  c.height = window.innerHeight;
  const pts = Array.from({length:30}, () => ({
    x: Math.random()*c.width, y: Math.random()*c.height,
    vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3
  }));
  function draw() {
    if (!$('pin-screen').classList.contains('active')) return;
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0;
      if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0;
      pts.forEach(q => {
        const d = Math.hypot(p.x-q.x, p.y-q.y);
        if(d<120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,45,59,${0.06*(1-d/120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x,p.y);
          ctx.lineTo(q.x,q.y);
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════
   PIN ACCESS
═══════════════════════════════════════════ */
function initPin() {
  document.querySelectorAll('.pkey[data-v]').forEach(b =>
    b.addEventListener('click', () => pinDigit(b.dataset.v))
  );
  $('pkey-del').addEventListener('click', () => { S.pin = S.pin.slice(0,-1); updateDots(); });
  $('pkey-ok').addEventListener('click', pinSubmit);
  document.addEventListener('keydown', e => {
    if (!$('pin-screen').classList.contains('active')) return;
    if (/^[0-9]$/.test(e.key)) pinDigit(e.key);
    if (e.key === 'Backspace') { S.pin = S.pin.slice(0,-1); updateDots(); }
    if (e.key === 'Enter') pinSubmit();
  });
}

function pinDigit(d) {
  if (S.pin.length >= 4) return;
  S.pin += d;
  updateDots();
  if (S.pin.length === 4) setTimeout(pinSubmit, 200);
}

function updateDots() {
  for (let i = 0; i < 4; i++) {
    const el = $(`pd${i}`);
    if (!el) return;
    el.className = 'pdot' + (i < S.pin.length ? ' filled' : '');
  }
}

function pinSubmit() {
  const correct = localStorage.getItem('aria_pin') || CONFIG.PIN;
  if (S.pin === correct) {
    // Flash green briefly
    for (let i = 0; i < 4; i++) { const el = $(`pd${i}`); if(el) el.classList.add('filled'); }
    S.authenticated = true;
    S.pin = '';
    if (localStorage.getItem(LS.STAY) !== 'false') localStorage.setItem(LS.AUTH, 'true');
    setTimeout(() => { transition('pin-screen','conn-screen'); runConnect(); }, 320);
  } else {
    for (let i = 0; i < 4; i++) { const el = $(`pd${i}`); if(el) el.className = 'pdot error'; }
    const err = $('pin-error');
    err?.classList.remove('hidden');
    S.pin = '';
    setTimeout(() => { updateDots(); err?.classList.add('hidden'); }, 1500);
  }
}

/* ═══════════════════════════════════════════
   CONNECT SCREEN
═══════════════════════════════════════════ */
function initConnCanvas() {
  const c = $('conn-canvas');
  if (!c) return;
  c.width = window.innerWidth; c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  const rings = [{r:0,a:0.6},{r:0,a:0.3},{r:0,a:0.1}];
  let animId;
  function draw() {
    if (!$('conn-screen').classList.contains('active')) { cancelAnimationFrame(animId); return; }
    ctx.clearRect(0,0,c.width,c.height);
    const cx = c.width/2, cy = c.height/2;
    rings.forEach((ring, i) => {
      ring.r = (ring.r + 0.5) % (Math.min(c.width,c.height)/2);
      ctx.beginPath();
      ctx.arc(cx,cy,ring.r,0,Math.PI*2);
      ctx.strokeStyle = `rgba(255,45,59,${ring.a*(1-ring.r/(Math.min(c.width,c.height)/2))})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    animId = requestAnimationFrame(draw);
  }
  draw();
}

async function runConnect() {
  initConnCanvas();
  const steps = [$('cs0'),$('cs1'),$('cs2'),$('cs3')];
  for (let i = 0; i < steps.length; i++) {
    await sleep(380 + i * 400);
    if (i > 0) steps[i-1].className = 'cstep done';
    steps[i].className = 'cstep active';
    if (i === 1) await checkBackend();
  }
  await sleep(350);
  steps[steps.length-1].className = 'cstep done';
  await sleep(600);
  transition('conn-screen','app');
  onAppReady();
}

async function checkBackend() {
  setStatus('connecting','CONNECTING');
  try {
    const res = await Promise.race([
      fetch(`${S.backendUrl}/api/health`),
      new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 4000)),
    ]);
    if (res.ok) {
      S.backendOnline = true;
      S.fallbackMode = false;
      setStatus('online','ONLINE');
      const data = await res.json().catch(() => ({}));
      if (data.keysConfigured) {
        const miss = Object.entries(data.keysConfigured).filter(([,v])=>!v).map(([k])=>k);
        if (miss.length) toast(`API keys missing: ${miss.join(', ')} — add to .env`, 'warning', 5000);
      }
      updateAgentStatuses(data.keysConfigured || {});
    } else { throw new Error(`HTTP ${res.status}`); }
  } catch {
    S.backendOnline = false;
    setStatus('offline','OFFLINE');
    setFallbackMode(true);
  }
}

function setStatus(state, label) {
  const dot = $('ts-dot'), lbl = $('ts-label');
  if (!dot) return;
  dot.className = `ts-dot ${state}`;
  lbl.className = `${state}`;
  lbl.textContent = label;

  const spDot = $('sp-dot');
  if (spDot) spDot.className = `sp-dot ${state === 'online' ? '' : state}`;

  // Update model chip dot
  const mcDot = $('mc-dot');
  if (mcDot) mcDot.style.background = state === 'online' ? '#10d07a' : '#ff4444';
}

function setFallbackMode(on) {
  S.fallbackMode = on;
  const banner = $('fallback-banner');
  if (banner) on ? banner.classList.remove('hidden') : banner.classList.add('hidden');
}

function updateAgentStatuses(keys) {
  const map = {openai:'acs-gpt', anthropic:'acs-claude', gemini:'acs-gemini', deepseek:'acs-deepseek'};
  Object.entries(map).forEach(([key, elId]) => {
    const el = $(elId);
    if (!el) return;
    if (keys[key]) { el.textContent = 'CONNECTED'; el.className = 'ac-status ok'; }
    else { el.textContent = 'KEY MISSING'; el.className = 'ac-status fail'; }
  });
}

function transition(fromId, toId) {
  $(fromId)?.classList.remove('active');
  $(toId)?.classList.add('active');
}

/* ═══════════════════════════════════════════
   APP READY
═══════════════════════════════════════════ */
function onAppReady() {
  initSidebar();
  initTopbar();
  initChat();
  initDebate();
  initVoiceView();
  initSettings();
  initWelcomeCanvas();
  renderChatHistory();
  initNeuralCanvas();
  setInterval(() => { if(!S.debating) checkBackend(); }, 60000);
  $('mem-msgs').textContent = S.chat.length;
  $('mem-days').textContent = Math.max(1, Math.round((Date.now() - parseInt(localStorage.getItem('aria_first') || Date.now())) / 86400000));
  if (!localStorage.getItem('aria_first')) localStorage.setItem('aria_first', Date.now());
}

/* ═══════════════════════════════════════════
   SIDEBAR + NAVIGATION
═══════════════════════════════════════════ */
function initSidebar() {
  document.querySelectorAll('.sb-btn[data-view], .mn-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      if (window.innerWidth <= 768) $('sidebar')?.classList.remove('open');
    });
  });
  $('sb-settings')?.addEventListener('click', openSettings);
  $('sb-lock')?.addEventListener('click', lockSession);
  $('hamburger')?.addEventListener('click', () => $('sidebar')?.classList.toggle('open'));
  $('mn-settings')?.addEventListener('click', openSettings);
  $('banner-close')?.addEventListener('click', () => $('fallback-banner')?.classList.add('hidden'));

  // Also route "wlc-chip" and "markets-placeholder-btns" chips to chat
  document.querySelectorAll('.wlc-chip, .markets-placeholder-btns .wlc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt) {
        switchView('chat');
        $('chat-input').value = prompt;
        handleChatSend();
      }
    });
  });
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sb-btn[data-view], .mn-btn[data-view]').forEach(b => b.classList.remove('active'));
  $(`view-${viewId}`)?.classList.add('active');
  document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));
  if (viewId === 'debate') { setTimeout(resizeNeuralCanvas, 50); }
}

/* ═══════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════ */
function initTopbar() {
  const ms = $('model-select');
  if (ms) {
    ms.value = S.model;
    ms.addEventListener('change', () => {
      S.model = ms.value;
      localStorage.setItem(LS.MODEL, S.model);
      updateModelChip();
      toast(`Model: ${ms.options[ms.selectedIndex].text}`, 'info');
    });
  }
  $('tb-clear')?.addEventListener('click', clearChat);
  updateModelChip();
}

function updateModelChip() {
  const labels = { openai:'GPT-4o', claude:'Claude 3.5', gemini:'Gemini 1.5', deepseek:'DeepSeek' };
  const colors = { openai:'#10d07a', claude:'#f5a623', gemini:'#4d9fff', deepseek:'#b060ff' };
  const chip = $('mc-label');
  const dot  = $('mc-dot');
  if (chip) chip.textContent = labels[S.model] || S.model;
  if (dot)  dot.style.background = colors[S.model] || '#fff';
}

/* ═══════════════════════════════════════════
   WELCOME CANVAS
═══════════════════════════════════════════ */
function initWelcomeCanvas() {
  const c = $('welcome-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);

  const pts = Array.from({length:40}, () => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    vx: (Math.random()-0.5)*0.4,
    vy: (Math.random()-0.5)*0.4,
    r: Math.random()*1.5+0.5,
  }));

  function draw() {
    if (!$('view-chat')?.classList.contains('active')) { requestAnimationFrame(draw); return; }
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);

    // Radial gradient bg
    const grad = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.6);
    grad.addColorStop(0,'rgba(255,45,59,0.04)');
    grad.addColorStop(0.5,'rgba(255,45,59,0.015)');
    grad.addColorStop(1,'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;

      pts.forEach(q => {
        const d = Math.hypot(p.x-q.x,p.y-q.y);
        if(d<100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,45,59,${0.08*(1-d/100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.stroke();
        }
      });

      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = 'rgba(255,45,59,0.3)';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════
   CHAT SYSTEM
═══════════════════════════════════════════ */
function loadSettings() {
  const b = localStorage.getItem(LS.BACK);  if(b) S.backendUrl = b;
  const m = localStorage.getItem(LS.MODEL); if(m) S.model = m;
  const u = localStorage.getItem(LS.USER);  if(u) S.userName = u;
  try { const c = localStorage.getItem(LS.CHAT); S.chat = c ? JSON.parse(c) : []; } catch { S.chat = []; }
}

function initChat() {
  $('send-btn')?.addEventListener('click', handleChatSend);
  $('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  });
  $('ib-mic')?.addEventListener('click', () => {
    S.voiceActive ? stopVoice() : startVoice();
  });
}

async function handleChatSend() {
  const input = $('chat-input')?.value.trim();
  if (!input) return;
  $('chat-input').value = '';

  // Hide welcome
  const welcome = $('welcome');
  if (welcome && !welcome.classList.contains('hidden')) welcome.classList.add('hidden');
  const feed = $('chat-feed');
  if (feed) feed.classList.remove('hidden');

  appendMsg('user', input);

  // 1. Try local commands/math first (always works)
  const localResult = FALLBACK.handle(input);

  // 2. If backend is online AND not in fallback mode, use AI
  if (S.backendOnline && !S.fallbackMode) {
    const tid = showTyping();
    $('send-btn').disabled = true;
    try {
      const reply = await callChatAPI(input, S.model);
      removeTyping(tid);
      $('send-btn').disabled = false;
      appendMsg('aria', reply, S.model);
    } catch (err) {
      removeTyping(tid);
      $('send-btn').disabled = false;
      handleAPIError(err, input);
    }
    return;
  }

  // 3. Fallback mode
  await sleep(300 + Math.random() * 400); // small delay feels more natural
  if (localResult) {
    appendMsg('aria', localResult, null, 'fallback');
  } else {
    appendMsg('aria', FALLBACK.reply(input), null, 'fallback');
  }
}

async function callChatAPI(message, model) {
  const res = await Promise.race([
    fetch(`${S.backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ message, model }),
    }),
    new Promise((_,r) => setTimeout(() => r(new Error('Request timed out')), 20000)),
  ]);

  if (res.status === 429) throw Object.assign(new Error('Rate limit'), { type:'rate_limit' });
  if (res.status === 401) throw Object.assign(new Error('Invalid API key'), { type:'auth' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { type:'http' });

  const data = await res.json();
  return data.reply || data.message || 'No response received.';
}

function handleAPIError(err, originalInput) {
  const type = err.type || 'unknown';
  let userMsg;

  if (type === 'rate_limit' || err.message.includes('limit') || err.message.includes('quota')) {
    setFallbackMode(true);
    S.backendOnline = false;
    setStatus('offline', 'LIMIT');
    userMsg = 'Cloud AI limit reached — switching to local fallback mode.\n\n' + FALLBACK.handle(originalInput);
  } else if (type === 'auth' || err.message.includes('key')) {
    userMsg = `API key issue. Check your .env file and restart the server.\n\nFor now: ${FALLBACK.handle(originalInput)}`;
  } else if (err.message.includes('timeout') || err.message.includes('fetch')) {
    S.backendOnline = false;
    setStatus('offline', 'OFFLINE');
    setFallbackMode(true);
    userMsg = `Connection lost. Switching to local mode.\n\n${FALLBACK.handle(originalInput)}`;
  } else {
    userMsg = `Something went wrong (${err.message}). Falling back locally.\n\n${FALLBACK.handle(originalInput)}`;
    setFallbackMode(true);
  }

  appendMsg('aria', userMsg, null, 'fallback');
}

function appendMsg(role, text, model = null, badge = null, save = true) {
  const ts = Date.now();
  if (save && role !== 'system') {
    S.chat.push({ role, text, model, ts });
    if (S.chat.length > 200) S.chat.shift();
    localStorage.setItem(LS.CHAT, JSON.stringify(S.chat));
    $('mem-msgs').textContent = S.chat.length;
  }
  renderMsg(role, text, model, badge, ts, true);
}

function renderMsg(role, text, model, badge, ts, anim) {
  const feed = $('chat-feed');
  if (!feed) return;

  const isAria = role === 'aria';
  const div = document.createElement('div');
  div.className = `message ${role}`;
  if (!anim) div.style.animation = 'none';

  const t = ts ? new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
  const modelLabels = { openai:'GPT-4o', claude:'Claude 3.5', gemini:'Gemini 1.5', deepseek:'DeepSeek' };
  const badgeHtml = isAria && model
    ? `<div class="msg-badge">${modelLabels[model]||model}</div>`
    : badge === 'fallback'
    ? `<div class="msg-badge fallback">LOCAL FALLBACK</div>`
    : '';

  // Convert **bold** markdown
  const htmlText = esc(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');

  div.innerHTML = `
    <div class="msg-avatar">${isAria?'AI':'YOU'}</div>
    <div class="msg-body">
      <div class="msg-role">${isAria?'ARIA':'YOU'}</div>
      <div class="msg-text">${htmlText}</div>
      ${badgeHtml}
      <div class="msg-time">${t}</div>
    </div>`;
  feed.appendChild(div);
  scrollFeed();
}

function renderChatHistory() {
  const feed = $('chat-feed');
  if (!feed) return;
  if (S.chat.length === 0) return;
  const welcome = $('welcome');
  if (welcome) welcome.classList.add('hidden');
  feed.classList.remove('hidden');
  S.chat.forEach(m => renderMsg(m.role, m.text, m.model, null, m.ts, false));
  scrollFeed();
}

function showTyping() {
  const feed = $('chat-feed');
  if (!feed) return null;
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'message aria';
  div.innerHTML = `<div class="msg-avatar">AI</div><div class="msg-body"><div class="msg-role">ARIA</div><div class="msg-text"><div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div></div>`;
  feed.appendChild(div);
  scrollFeed();
  return id;
}

function removeTyping(id) { if(id) $(id)?.remove(); }
function scrollFeed() { requestAnimationFrame(() => { const f=$('chat-feed'); if(f) f.scrollTop=f.scrollHeight; }); }

function clearChat() {
  S.chat = [];
  localStorage.removeItem(LS.CHAT);
  const feed = $('chat-feed');
  if (feed) { feed.innerHTML = ''; feed.classList.add('hidden'); }
  const welcome = $('welcome');
  if (welcome) welcome.classList.remove('hidden');
  $('mem-msgs').textContent = '0';
  toast('Chat cleared','info');
}

/* ═══════════════════════════════════════════
   NEURAL NETWORK CANVAS
═══════════════════════════════════════════ */
const NET = { canvas: null, ctx: null, W: 0, H: 0, particles: [], rafId: null };

// Node positions (computed from stage size)
function getNodePositions() {
  const W = NET.W, H = NET.H;
  return {
    user:     { x: W * 0.50, y: H * 0.12 },
    claude:   { x: W * 0.15, y: H * 0.42 },
    gemini:   { x: W * 0.85, y: H * 0.42 },
    deepseek: { x: W * 0.15, y: H * 0.75 },
    gpt:      { x: W * 0.85, y: H * 0.75 },
    judge:    { x: W * 0.50, y: H * 0.88 },
  };
}

const NODE_CONNECTIONS = [
  ['user','claude'],['user','gemini'],['user','deepseek'],['user','gpt'],
  ['claude','judge'],['gemini','judge'],['deepseek','judge'],['gpt','judge'],
  ['claude','gemini'],['deepseek','gpt'],
];

function initNeuralCanvas() {
  NET.canvas = $('net-canvas');
  if (!NET.canvas) return;
  NET.ctx = NET.canvas.getContext('2d');
  resizeNeuralCanvas();
  window.addEventListener('resize', resizeNeuralCanvas);
  // Background particles
  for (let i = 0; i < 25; i++) NET.particles.push(newNetParticle());
  renderNeuralLoop();
}

function newNetParticle() {
  return {
    x: Math.random() * (NET.W || 400),
    y: Math.random() * (NET.H || 300),
    vx: (Math.random()-0.5)*0.3,
    vy: (Math.random()-0.5)*0.3,
    r: Math.random()*1+0.3,
  };
}

function resizeNeuralCanvas() {
  const stage = $('network-stage');
  if (!stage || !NET.canvas) return;
  NET.W = NET.canvas.width  = stage.offsetWidth;
  NET.H = NET.canvas.height = stage.offsetHeight;
  positionNodeElements();
}

function positionNodeElements() {
  if (!NET.W || !NET.H) return;
  const pos = getNodePositions();
  const nodeMap = {user:'node-user', claude:'node-claude', gemini:'node-gemini', deepseek:'node-deepseek', gpt:'node-gpt', judge:'node-judge'};
  Object.entries(nodeMap).forEach(([key, id]) => {
    const el = $(id);
    if (el && pos[key]) {
      el.style.left = pos[key].x + 'px';
      el.style.top  = pos[key].y + 'px';
    }
  });
}

// Animated particles travelling along edges
const EDGE_PARTICLES = [];

function spawnEdgeParticle(from, to, color) {
  const pos = getNodePositions();
  const a = pos[from], b = pos[to];
  if (!a || !b) return;
  EDGE_PARTICLES.push({ ax:a.x,ay:a.y, bx:b.x,by:b.y, t:0, color, speed:0.008+Math.random()*0.006 });
}

function renderNeuralLoop() {
  NET.rafId = requestAnimationFrame(renderNeuralLoop);
  const ctx = NET.ctx;
  if (!ctx || !NET.W) return;
  ctx.clearRect(0, 0, NET.W, NET.H);

  const pos = getNodePositions();

  // Background gradient
  const bgGrad = ctx.createRadialGradient(NET.W/2,NET.H/2,0,NET.W/2,NET.H/2,NET.W*0.7);
  bgGrad.addColorStop(0,'rgba(255,45,59,0.03)');
  bgGrad.addColorStop(1,'transparent');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0,0,NET.W,NET.H);

  // Draw static connection lines
  const agentActive = S.debating;
  NODE_CONNECTIONS.forEach(([a, b]) => {
    const pa = pos[a], pb = pos[b];
    if (!pa || !pb) return;
    const grad = ctx.createLinearGradient(pa.x,pa.y,pb.x,pb.y);
    const alpha = agentActive ? 0.2 : 0.08;
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.5, `rgba(255,45,59,${alpha * 1.5})`);
    grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = agentActive ? 1 : 0.5;
    ctx.moveTo(pa.x,pa.y);
    ctx.lineTo(pb.x,pb.y);
    ctx.stroke();
  });

  // Animate edge particles
  for (let i = EDGE_PARTICLES.length - 1; i >= 0; i--) {
    const p = EDGE_PARTICLES[i];
    p.t += p.speed;
    if (p.t >= 1) { EDGE_PARTICLES.splice(i,1); continue; }
    const x = p.ax + (p.bx - p.ax) * p.t;
    const y = p.ay + (p.by - p.ay) * p.t;
    // Glow
    const grd = ctx.createRadialGradient(x,y,0,x,y,14);
    grd.addColorStop(0, p.color.replace('1)','0.6)'));
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x,y,14,0,Math.PI*2); ctx.fill();
    // Core dot
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  // Randomly spawn particles during debate
  if (S.debating && Math.random() < 0.04) {
    const edges = NODE_CONNECTIONS;
    const e = edges[Math.floor(Math.random()*edges.length)];
    const colors = ['rgba(16,208,122,1)','rgba(245,166,35,1)','rgba(77,159,255,1)','rgba(176,96,255,1)','rgba(255,45,59,1)'];
    spawnEdgeParticle(e[0],e[1], colors[Math.floor(Math.random()*colors.length)]);
  }

  // Background particles
  NET.particles.forEach(p => {
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=NET.W; if(p.x>NET.W)p.x=0;
    if(p.y<0)p.y=NET.H; if(p.y>NET.H)p.y=0;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
  });
}

function setNodeState(nodeId, state) {
  // state: 'idle' | 'thinking' | 'done'
  const el = $(nodeId);
  if (!el) return;
  el.classList.remove('thinking','done');
  if (state !== 'idle') el.classList.add(state);
  const statusEl = $(nodeId.replace('node-','ns-'));
  if (statusEl) {
    statusEl.className = `node-status ${state === 'idle' ? '' : state}`;
  }
}

/* ═══════════════════════════════════════════
   DEBATE SYSTEM
═══════════════════════════════════════════ */
function initDebate() {
  const tog = $('debate-tog');
  const st  = $('dt-status');
  tog?.addEventListener('change', () => {
    S.debateOn = tog.checked;
    st.textContent = S.debateOn ? 'ACTIVE' : 'OFF';
    st.className = `dt-status ${S.debateOn ? 'on' : 'off'}`;
    toast(S.debateOn ? 'Debate mode ON' : 'Debate mode OFF','info');
  });

  $('debate-send')?.addEventListener('click', handleDebateSend);
  $('debate-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDebateSend(); }
  });
}

async function handleDebateSend() {
  if (S.debating) return;
  const q = $('debate-input')?.value.trim();
  if (!q) return;
  $('debate-input').value = '';

  if (!S.debateOn) { toast('Enable debate mode first','error'); return; }

  S.debating = true;
  $('debate-send').disabled = true;

  // Hide network idle
  $('network-idle')?.classList.add('fade-out');

  // Clear old results
  const cardsEl = $('debate-cards');
  cardsEl.innerHTML = '';

  // Add question label
  const ql = document.createElement('div');
  ql.className = 'debate-q-label';
  ql.textContent = q.length > 60 ? q.slice(0,60) + '…' : q;
  cardsEl.appendChild(ql);

  // Activate user node
  setNodeState('node-user','thinking');
  await sleep(400);
  setNodeState('node-user','done');

  // If offline → fallback debate
  if (!S.backendOnline || S.fallbackMode) {
    await runFallbackDebate(q, cardsEl);
    S.debating = false;
    $('debate-send').disabled = false;
    return;
  }

  // Activate agent nodes
  setNodeState('node-claude','thinking');
  setNodeState('node-gemini','thinking');
  setNodeState('node-deepseek','thinking');
  setNodeState('node-gpt','thinking');

  // Spawn particles along user→agents
  ['claude','gemini','deepseek','gpt'].forEach((a,i) => {
    setTimeout(() => spawnEdgeParticle('user',a,'rgba(255,255,255,0.8)'), i*150);
  });

  let result = null;
  try {
    const res = await Promise.race([
      fetch(`${S.backendUrl}/api/debate`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:q}),
      }),
      new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 28000)),
    ]);

    if (res.status === 429 || res.status === 401) {
      setFallbackMode(true);
      throw Object.assign(new Error('API limit'), {type:'rate_limit'});
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result = await res.json();
  } catch (err) {
    ['node-claude','node-gemini','node-deepseek','node-gpt','node-judge'].forEach(n => setNodeState(n,'idle'));
    if (err.type === 'rate_limit' || S.fallbackMode) {
      await runFallbackDebate(q, cardsEl);
    } else {
      const errCard = document.createElement('div');
      errCard.innerHTML = `<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:12px">Connection error: ${esc(err.message)}<br><br>Running fallback analysis…</div>`;
      cardsEl.appendChild(errCard);
      await runFallbackDebate(q, cardsEl);
    }
    S.debating = false;
    $('debate-send').disabled = false;
    return;
  }

  // Stream results into cards
  const agentConfig = [
    { key:'claude',   nodeId:'node-claude',   color:'var(--claude-color)',   colorHex:'#f5a623', label:'CLAUDE', badge:'Anthropic' },
    { key:'gemini',   nodeId:'node-gemini',   color:'var(--gemini-color)',   colorHex:'#4d9fff', label:'GEMINI', badge:'Google' },
    { key:'deepseek', nodeId:'node-deepseek', color:'var(--deepseek-color)', colorHex:'#b060ff', label:'DEEPSEEK', badge:'DeepSeek AI' },
  ];

  for (const ag of agentConfig) {
    if (!result[ag.key]) continue;
    setNodeState(ag.nodeId, 'done');
    spawnEdgeParticle(ag.key.replace('deepseek','deepseek'), 'judge', ag.colorHex.replace('#','rgba(').concat(',0.8)').replace('rgba(','rgba(').replace('(','('));
    const card = makeDebateCard(ag.label, ag.badge, ag.colorHex, '');
    cardsEl.appendChild(card.el);
    await streamText(card.body, result[ag.key]);
    // Brief delay between agents
    await sleep(200);
  }

  // Judge
  setNodeState('node-gpt','done');
  await sleep(300);
  setNodeState('node-judge','thinking');
  ['claude','gemini','deepseek'].forEach((a,i) => {
    setTimeout(() => spawnEdgeParticle(a,'judge','rgba(255,45,59,0.9)'), i*200);
  });
  await sleep(1000);

  if (result.openai_judgment) {
    setNodeState('node-judge','done');
    const judgeEl = makeJudgeCard('');
    cardsEl.appendChild(judgeEl.el);
    await streamText(judgeEl.body, result.openai_judgment);
  }

  $('debate-results-panel').scrollTop = $('debate-cards').scrollHeight;
  S.debating = false;
  $('debate-send').disabled = false;
}

async function runFallbackDebate(q, cardsEl) {
  const fallbackAgents = [
    { label:'STRATEGIC PERSPECTIVE', badge:'Local Analysis', color:'#f5a623',
      text:`From a strategic standpoint on "${q}": Consider the long-term compounding effects. Focus on the highest-leverage moves — which actions create optionality? Identify the single most important variable driving outcomes and stress-test your assumptions against it.` },
    { label:'CRITICAL PERSPECTIVE', badge:'Local Analysis', color:'#4d9fff',
      text:`Challenging the premise of "${q}": What hidden assumptions break the entire thesis if wrong? Most plans fail not from bad execution, but from a fundamental misunderstanding of the problem. Identify the one question you're most afraid to answer honestly — that's where the real risk lives.` },
    { label:'REALIST PERSPECTIVE', badge:'Local Analysis', color:'#b060ff',
      text:`Ground reality on "${q}": Theory and execution are two different games. What resources, time, and skills are actually required? Where do most people attempting this fail, and why? Concrete constraints matter more than elegant frameworks.` },
  ];

  for (const ag of fallbackAgents) {
    setNodeState('node-claude','done');
    setNodeState('node-gemini','done');
    setNodeState('node-deepseek','done');
    const card = makeDebateCard(ag.label, ag.badge, ag.color, '');
    cardsEl.appendChild(card.el);
    await streamText(card.body, ag.text);
    await sleep(300);
  }

  setNodeState('node-judge','thinking');
  await sleep(600);
  const math = FALLBACK.math(q);
  const judgeText = math
    ? `Calculation result: ${math}\n\nFor deeper analysis, connect ARIA to a backend with valid API keys.`
    : `After weighing all perspectives on "${q}": The strategic view highlights leverage and optionality. The critical view exposes the hidden assumption that breaks everything. The realist view grounds execution in real constraints.\n\nVerdict: Begin with a low-cost experiment that tests your core assumption before committing. This is the move that survives all three critiques.\n\n⚠ This is a local fallback analysis. Connect API keys for full multi-model AI debate.`;
  setNodeState('node-judge','done');
  const judgeEl = makeJudgeCard('');
  cardsEl.appendChild(judgeEl.el);
  await streamText(judgeEl.body, judgeText);
}

function makeDebateCard(label, badge, colorHex, text) {
  const el = document.createElement('div');
  el.className = 'debate-card';
  const body = document.createElement('div');
  body.className = 'dc-body';
  body.textContent = text;
  el.innerHTML = `
    <div class="dc-header">
      <div class="dc-color-bar" style="background:${colorHex}"></div>
      <div class="dc-name" style="color:${colorHex}">${label}</div>
      <div class="dc-badge" style="color:${colorHex};border-color:${colorHex}40">${badge}</div>
    </div>`;
  el.appendChild(body);
  return { el, body };
}

function makeJudgeCard(text) {
  const el = document.createElement('div');
  el.className = 'judge-card';
  const body = document.createElement('div');
  body.className = 'jc-body';
  body.textContent = text;
  el.innerHTML = `
    <div class="jc-header">
      <div class="jc-title">⚖ FINAL JUDGMENT</div>
      <div class="jc-verdict-badge">VERDICT</div>
    </div>`;
  el.appendChild(body);
  return { el, body };
}

async function streamText(el, text, speed = 12) {
  el.textContent = '';
  el.classList.add('streaming');
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    if (i % 6 === 0) {
      const dr = $('debate-results-panel');
      if (dr) dr.scrollTop = dr.scrollHeight;
      await sleep(speed + Math.random() * 5);
    }
  }
  el.classList.remove('streaming');
}

/* ═══════════════════════════════════════════
   VOICE SYSTEM
═══════════════════════════════════════════ */
function initVoiceView() {
  $('voice-start-btn')?.addEventListener('click', () => {
    S.voiceActive ? stopVoice() : startVoice();
  });
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Voice input not supported in this browser. Use Chrome.', 'error'); return; }
  if (!S.recognition) {
    S.recognition = new SR();
    S.recognition.continuous = false;
    S.recognition.interimResults = false;
    S.recognition.lang = 'en-US';
    S.recognition.onresult = e => {
      const t = e.results[0][0].transcript.trim();
      const inp = $('chat-input');
      if (inp) inp.value = t;
      const tr = $('voice-transcript');
      if (tr) tr.textContent = '"' + t + '"';
      stopVoice();
      switchView('chat');
      handleChatSend();
    };
    S.recognition.onerror = () => stopVoice();
    S.recognition.onend   = () => { if (S.voiceActive) { try { S.recognition.start(); } catch {} } };
  }
  S.voiceActive = true;
  $('ib-mic')?.classList.add('listening');
  const btn = $('voice-start-btn');
  if (btn) btn.textContent = '⏹ STOP LISTENING';
  try { S.recognition.start(); } catch {}
  toast('Listening… speak now', 'info');
}

function stopVoice() {
  S.voiceActive = false;
  $('ib-mic')?.classList.remove('listening');
  const btn = $('voice-start-btn');
  if (btn) { btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>START LISTENING`; }
  if (S.recognition) { try { S.recognition.stop(); } catch {} }
}

/* ═══════════════════════════════════════════
   SETTINGS MODAL
═══════════════════════════════════════════ */
function initSettings() {
  $('sb-settings')?.addEventListener('click', openSettings);
  $('modal-close')?.addEventListener('click', closeSettings);
  $('modal-cancel')?.addEventListener('click', closeSettings);
  $('modal-save')?.addEventListener('click', saveSettingsModal);
  $('modal-settings')?.addEventListener('click', e => { if(e.target === $('modal-settings')) closeSettings(); });
}

function openSettings() {
  $('set-backend').value = S.backendUrl;
  $('set-model').value   = S.model;
  $('set-name').value    = S.userName;
  $('set-stay').checked  = localStorage.getItem(LS.STAY) !== 'false';
  $('modal-settings').classList.remove('hidden');
}
function closeSettings() { $('modal-settings').classList.add('hidden'); }

function saveSettingsModal() {
  S.backendUrl = $('set-backend').value.trim().replace(/\/$/,'') || CONFIG.BACKEND;
  S.model      = $('set-model').value;
  S.userName   = $('set-name').value.trim() || CONFIG.USER;
  const stay   = $('set-stay').checked;
  localStorage.setItem(LS.BACK,  S.backendUrl);
  localStorage.setItem(LS.MODEL, S.model);
  localStorage.setItem(LS.USER,  S.userName);
  localStorage.setItem(LS.STAY,  stay ? 'true' : 'false');
  const ms = $('model-select');
  if (ms) ms.value = S.model;
  updateModelChip();
  closeSettings();
  toast('Settings saved','success');
  checkBackend();
}

/* ═══════════════════════════════════════════
   LOCK SESSION
═══════════════════════════════════════════ */
function lockSession() {
  S.authenticated = false;
  localStorage.removeItem(LS.AUTH);
  S.pin = '';
  updateDots();
  $('pin-error')?.classList.add('hidden');
  $('app').classList.remove('active');
  transition('app','pin-screen');
  initPinCanvas();
  toast('Session locked','info');
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function toast(msg, type='info', dur=3200) {
  const c = $('toasts');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>el.remove(),300); }, dur);
}

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initPin();
  runBoot();
});

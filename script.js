/*
ARIA SYSTEM
Created by Kritesh Dhungel.
This code belongs to Kritesh Dhungel.
Unauthorized copying, resale, or redistribution is prohibited.
Violation may result in a $100 copyright fine.
*/

'use strict';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const CONFIG = {
  PIN:         '2331',                  // ← change your PIN here
  BACKEND:     'http://localhost:3000', // ← your backend URL
  USER:        'Mr. Kritesh',
  STAY:        true,
};

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const S = {
  authenticated: false,
  pin:           '',
  backendOnline: false,
  backendUrl:    CONFIG.BACKEND,
  model:         'openai',
  debateOn:      true,
  chat:          [],       // [{role,text,model,ts}]
  userName:      CONFIG.USER,
  debating:      false,
};

const LS = {
  AUTH: 'aria_auth', CHAT: 'aria_chat',
  BACK: 'aria_back', MODEL: 'aria_model',
  USER: 'aria_user', STAY: 'aria_stay',
};

const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
const BOOT_LOG = [
  'INITIALIZING ARIA CORE',
  'LOADING DEBATE ENGINE',
  'CALIBRATING AGENTS',
  'NEURAL NETWORK READY',
  'SYSTEM ONLINE',
];

async function runBoot() {
  const ringFill = $('ring-fill');
  const pctEl    = $('boot-pct');
  const CIRC     = 2 * Math.PI * 88; // r=88

  for (let i = 0; i < BOOT_LOG.length; i++) {
    await sleep(i === 0 ? 200 : 380 + Math.random() * 200);
    const pct = (i + 1) / BOOT_LOG.length;
    ringFill.style.strokeDashoffset = CIRC * (1 - pct);
    pctEl.textContent = Math.round(pct * 100);

    for (let j = 0; j <= i; j++) {
      const el = $(`bsl-${j}`);
      if (el) el.className = j === i ? 'bsl act' : 'bsl done';
    }
  }

  await sleep(600);
  loadSettings();

  const stayIn = localStorage.getItem(LS.STAY) !== 'false';
  if (localStorage.getItem(LS.AUTH) === 'true' && stayIn) {
    S.authenticated = true;
    go('s-boot', 's-conn');
    runConnect();
  } else {
    go('s-boot', 's-access');
  }
}

function loadSettings() {
  const b = localStorage.getItem(LS.BACK);  if (b) S.backendUrl = b;
  const m = localStorage.getItem(LS.MODEL); if (m) S.model      = m;
  const u = localStorage.getItem(LS.USER);  if (u) S.userName   = u;
  try { const c = localStorage.getItem(LS.CHAT); S.chat = c ? JSON.parse(c) : []; } catch { S.chat = []; }
}

// ═══════════════════════════════════════════════════════════
// SCREEN HELPER
// ═══════════════════════════════════════════════════════════
function go(from, to) {
  $(from)?.classList.remove('active');
  $(to)?.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// PIN PAD
// ═══════════════════════════════════════════════════════════
function initPin() {
  document.querySelectorAll('.nk[data-v]').forEach(b =>
    b.addEventListener('click', () => pinDigit(b.dataset.v))
  );
  $('nk-del').addEventListener('click', pinDel);
  $('nk-ok').addEventListener('click', pinCheck);
  document.addEventListener('keydown', e => {
    if (!$('s-access').classList.contains('active')) return;
    if (/^[0-9]$/.test(e.key)) pinDigit(e.key);
    if (e.key === 'Backspace')  pinDel();
    if (e.key === 'Enter')      pinCheck();
  });
  updateSegs();
}

function pinDigit(d) {
  if (S.pin.length >= 4) return;
  S.pin += d;
  updateSegs();
  if (S.pin.length === 4) setTimeout(pinCheck, 180);
}

function pinDel() { S.pin = S.pin.slice(0, -1); updateSegs(); $('pin-err').classList.add('hidden'); }

function updateSegs() {
  for (let i = 0; i < 4; i++) {
    const el = $(`ps-${i}`);
    el.className = 'pin-seg' + (i < S.pin.length ? ' filled' : '');
  }
}

function pinCheck() {
  const correct = localStorage.getItem('aria_pin') || CONFIG.PIN;
  if (S.pin === correct) {
    for (let i = 0; i < 4; i++) {
      const el = $(`ps-${i}`);
      el.classList.add('filled');
    }
    S.authenticated = true;
    S.pin = '';
    if (localStorage.getItem(LS.STAY) !== 'false')
      localStorage.setItem(LS.AUTH, 'true');
    setTimeout(() => { go('s-access', 's-conn'); runConnect(); }, 300);
  } else {
    for (let i = 0; i < 4; i++) $(`ps-${i}`).className = 'pin-seg err';
    $('pin-err').classList.remove('hidden');
    S.pin = '';
    setTimeout(() => { updateSegs(); $('pin-err').classList.add('hidden'); }, 1500);
  }
}

// ═══════════════════════════════════════════════════════════
// CONNECT SEQUENCE
// ═══════════════════════════════════════════════════════════
async function runConnect() {
  const els = ['cl-0','cl-1','cl-2','cl-3'].map(id => $(id));
  for (let i = 0; i < els.length; i++) {
    await sleep(380 + i * 360);
    if (i > 0) { els[i-1].className = 'cl-item done'; }
    els[i].className = 'cl-item active';
    if (i === 1) await checkBackend();
  }
  await sleep(300);
  els[els.length - 1].className = 'cl-item done';
  await sleep(600);
  go('s-conn', 's-dash');
  onDashReady();
}

async function checkBackend() {
  setStatus('pending', 'CONNECTING');
  try {
    const res = await Promise.race([
      fetch(`${S.backendUrl}/api/health`),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000)),
    ]);
    if (res.ok) {
      S.backendOnline = true;
      setStatus('online', 'ONLINE');
      const data = await res.json().catch(() => ({}));
      if (data.keysConfigured) {
        const miss = Object.entries(data.keysConfigured).filter(([,v]) => !v).map(([k]) => k);
        if (miss.length) toast(`MISSING KEYS: ${miss.join(', ')}`, 'error', 5000);
      }
    } else { throw new Error(`HTTP ${res.status}`); }
  } catch {
    S.backendOnline = false;
    setStatus('offline', 'OFFLINE');
  }
}

function setStatus(state, label) {
  const dot = $('sp-dot'), lbl = $('sp-label');
  if (!dot) return;
  dot.className = `sp-dot ${state}`;
  lbl.textContent = label;
  lbl.style.color = state === 'online'  ? 'rgba(255,255,255,0.5)'
                  : state === 'offline' ? 'rgba(255,80,80,0.8)'
                  : 'rgba(255,255,255,0.3)';
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function onDashReady() {
  initNav();
  initChat();
  initDebate();
  initSettings();
  renderChatHistory();
  initNeuralCanvas();
  setInterval(checkBackend, 60000);
}

// ═══════════════════════════════════════════════════════════
// NAV & SIDEBAR
// ═══════════════════════════════════════════════════════════
function initNav() {
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-lock').addEventListener('click', lockSession);
  $('nav-menu-btn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  // Sidebar nav
  document.querySelectorAll('.sb-btn[data-view], .bn-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      if (window.innerWidth <= 768) $('sidebar').classList.remove('open');
    });
  });

  $('bn-settings')?.addEventListener('click', openSettings);

  // Greeting
  const h = new Date().getHours();
  const p = h < 12 ? 'MORNING' : h < 18 ? 'AFTERNOON' : 'EVENING';
  $('nav-status-display').innerHTML =
    `<span style="font-family:var(--font-m);font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.2)">${p}, ${S.userName.toUpperCase()}</span>`;
}

function switchView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sb-btn[data-view], .bn-btn[data-view]').forEach(b => b.classList.remove('active'));
  $(`view-${v}`)?.classList.add('active');
  document.querySelectorAll(`[data-view="${v}"]`).forEach(b => b.classList.add('active'));
  if (v === 'debate') resizeNeuralCanvas();
}

// ═══════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════
function initChat() {
  $('send-btn').addEventListener('click', sendChat);
  $('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  $('btn-clear-chat').addEventListener('click', clearChat);
  $('mic-btn').addEventListener('click', () => toast('VOICE — COMING SOON', 'info'));

  const ms = $('model-select');
  ms.value = S.model;
  ms.addEventListener('change', () => {
    S.model = ms.value;
    localStorage.setItem(LS.MODEL, S.model);
    toast(`MODEL: ${ms.options[ms.selectedIndex].text}`, 'info');
  });
}

async function sendChat() {
  const raw = $('chat-input').value.trim();
  if (!raw) return;
  $('chat-input').value = '';

  // Hide welcome
  $('chat-welcome')?.classList.add('gone');

  addMsg('user', raw);

  if (!S.backendOnline) {
    addMsg('aria', `Backend offline. Start server.js and ensure it's running at ${S.backendUrl}.`);
    return;
  }

  const tid = showTyping();
  $('send-btn').disabled = true;

  try {
    const res = await fetch(`${S.backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: raw, model: S.model }),
    });
    removeTyping(tid);
    $('send-btn').disabled = false;

    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      addMsg('aria', `Error: ${e.error}`, S.model);
      return;
    }
    const data = await res.json();
    addMsg('aria', data.reply, data.model);

  } catch (err) {
    removeTyping(tid);
    $('send-btn').disabled = false;
    addMsg('aria', `Connection error: ${err.message}`);
    S.backendOnline = false; setStatus('offline', 'OFFLINE');
  }
}

function addMsg(role, text, model = null, save = true) {
  const ts = Date.now();
  if (save) {
    S.chat.push({ role, text, model, ts });
    if (S.chat.length > 200) S.chat.shift();
    localStorage.setItem(LS.CHAT, JSON.stringify(S.chat));
  }
  renderMsg(role, text, model, ts, true);
}

function renderMsg(role, text, model, ts, anim) {
  const feed = $('chat-feed');
  const isAria = role === 'aria';
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  if (!anim) div.style.animation = 'none';
  const t = ts ? new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
  const badge = (isAria && model) ? `<div class="msg-badge">${mlabel(model)}</div>` : '';
  div.innerHTML = `
    <div class="msg-av">${isAria ? 'AI' : 'YOU'}</div>
    <div class="msg-bd">
      <div class="msg-lbl">${isAria ? 'ARIA' : 'YOU'}</div>
      <div class="msg-txt">${esc(text)}</div>
      ${badge}
      <div class="msg-ts">${t}</div>
    </div>`;
  feed.appendChild(div);
  scrollFeed();
}

function renderChatHistory() {
  const feed = $('chat-feed');
  if (!feed) return;
  S.chat.forEach(m => renderMsg(m.role, m.text, m.model, m.ts, false));
  if (S.chat.length > 0) $('chat-welcome')?.classList.add('gone');
  scrollFeed();
}

function showTyping() {
  const feed = $('chat-feed');
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.id = id; div.className = 'msg aria';
  div.innerHTML = `<div class="msg-av">AI</div><div class="msg-bd"><div class="msg-lbl">ARIA</div><div class="msg-txt"><div class="tdots"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div></div></div>`;
  feed.appendChild(div); scrollFeed();
  return id;
}

function removeTyping(id) { $(id)?.remove(); }
function scrollFeed() { requestAnimationFrame(() => { const f = $('chat-feed'); if (f) f.scrollTop = f.scrollHeight; }); }
function clearChat() { S.chat = []; localStorage.removeItem(LS.CHAT); const f = $('chat-feed'); f.innerHTML = ''; const ws = document.createElement('div'); ws.className = 'welcome-state'; ws.id = 'chat-welcome'; ws.innerHTML = `<div class="ws-logo"><div class="ws-ring"></div><div class="kd-mark lg">K:D</div></div><div class="ws-title">ARIA ONLINE</div><div class="ws-sub">Select a model. Ask anything.</div>`; f.appendChild(ws); toast('CHAT CLEARED', 'info'); }

// ═══════════════════════════════════════════════════════════
// DEBATE
// ═══════════════════════════════════════════════════════════
function initDebate() {
  const tog = $('debate-toggle');
  const st  = $('dt-status');
  tog.addEventListener('change', () => {
    S.debateOn = tog.checked;
    st.textContent = S.debateOn ? 'ACTIVE' : 'OFF';
    st.className   = `dt-status ${S.debateOn ? 'on' : 'off'}`;
    if (!S.debateOn) toast('DEBATE MODE OFF', 'info');
    else toast('DEBATE MODE ACTIVE', 'info');
  });

  $('debate-send-btn').addEventListener('click', sendDebate);
  $('debate-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDebate(); }
  });
}

async function sendDebate() {
  if (S.debating) return;
  const q = $('debate-input').value.trim();
  if (!q) return;
  $('debate-input').value = '';

  if (!S.debateOn) { toast('ENABLE DEBATE MODE FIRST', 'error'); return; }
  if (!S.backendOnline) { toast('BACKEND OFFLINE', 'error'); return; }

  S.debating = true;
  $('debate-send-btn').disabled = true;

  // Hide idle text
  $('neural-idle')?.classList.add('hidden-fade');

  // Activate all nodes → thinking
  ['node-claude','node-gemini','node-deepseek','node-judge'].forEach(id => {
    const n = $(id);
    if (n) { n.classList.remove('done'); n.classList.add('thinking'); }
  });

  // Create result round
  const round = buildDebateRound(q);
  $('debate-results').appendChild(round.el);
  $('debate-results').scrollTop = $('debate-results').scrollHeight;

  try {
    const res = await fetch(`${S.backendUrl}/api/debate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      setRoundError(round, e.error);
      S.debating = false; $('debate-send-btn').disabled = false;
      resetNodes();
      return;
    }

    const data = await res.json();

    // Sequence: Claude done → Gemini done → DeepSeek done → Judge done
    $('node-claude').classList.remove('thinking'); $('node-claude').classList.add('done');
    await streamCard(round.cl, data.claude);

    $('node-gemini').classList.remove('thinking'); $('node-gemini').classList.add('done');
    await streamCard(round.gm, data.gemini);

    $('node-deepseek').classList.remove('thinking'); $('node-deepseek').classList.add('done');
    await streamCard(round.ds, data.deepseek);

    $('node-judge').classList.remove('thinking'); $('node-judge').classList.add('done');
    await streamCard(round.jc, data.openai_judgment);

    $('debate-results').scrollTop = $('debate-results').scrollHeight;

  } catch (err) {
    setRoundError(round, `Connection error: ${err.message}`);
    S.backendOnline = false; setStatus('offline', 'OFFLINE');
    resetNodes();
  }

  S.debating = false;
  $('debate-send-btn').disabled = false;
}

function buildDebateRound(q) {
  const el = document.createElement('div');
  el.className = 'debate-round';
  el.innerHTML = `
    <div class="dr-q-label">ANALYSIS — ${esc(q)}</div>
    <div class="debate-cards-row">
      <div class="debate-card">
        <div class="dc-header"><div class="dc-icon">CL</div><div class="dc-name">CLAUDE</div></div>
        <div class="dc-content cl-content"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>
      </div>
      <div class="debate-card">
        <div class="dc-header"><div class="dc-icon">GM</div><div class="dc-name">GEMINI</div></div>
        <div class="dc-content gm-content"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>
      </div>
      <div class="debate-card">
        <div class="dc-header"><div class="dc-icon">DS</div><div class="dc-name">DEEPSEEK</div></div>
        <div class="dc-content ds-content"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>
      </div>
    </div>
    <div class="judge-card">
      <div class="jc-header">
        <div class="dc-icon">AI</div>
        <div class="jc-title">GPT-4o — FINAL JUDGMENT</div>
        <div class="jc-badge">VERDICT</div>
      </div>
      <div class="jc-content jc-content-text"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>
    </div>`;
  return {
    el,
    cl: el.querySelector('.cl-content'),
    gm: el.querySelector('.gm-content'),
    ds: el.querySelector('.ds-content'),
    jc: el.querySelector('.jc-content-text'),
  };
}

async function streamCard(el, text, speed = 13) {
  el.innerHTML = ''; el.classList.add('sc');
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    if (i % 5 === 0) { $('debate-results').scrollTop = $('debate-results').scrollHeight; await sleep(speed + Math.random() * 5); }
  }
  el.classList.remove('sc');
}

function setRoundError(round, msg) {
  [round.cl, round.gm, round.ds, round.jc].forEach(el => { el.textContent = msg; el.style.color = 'rgba(255,80,80,0.7)'; });
}

function resetNodes() {
  ['node-claude','node-gemini','node-deepseek','node-judge'].forEach(id => {
    const n = $(id);
    if (n) { n.classList.remove('thinking', 'done'); }
  });
}

// ═══════════════════════════════════════════════════════════
// NEURAL CANVAS
// ═══════════════════════════════════════════════════════════
let NC = { canvas: null, ctx: null, raf: null, particles: [], W: 0, H: 0 };

function initNeuralCanvas() {
  NC.canvas = $('neural-canvas');
  NC.ctx    = NC.canvas.getContext('2d');
  resizeNeuralCanvas();
  window.addEventListener('resize', resizeNeuralCanvas);
  // Init particles
  for (let i = 0; i < 40; i++) NC.particles.push(newParticle());
  renderNeuralLoop();
}

function resizeNeuralCanvas() {
  if (!NC.canvas) return;
  const wrap = $('neural-wrap');
  if (!wrap) return;
  NC.W = NC.canvas.width  = wrap.offsetWidth;
  NC.H = NC.canvas.height = wrap.offsetHeight;
  positionNodes();
}

function positionNodes() {
  const W = NC.W, H = NC.H;
  if (!W || !H) return;
  const positions = {
    'node-claude':   { x: W * 0.22, y: H * 0.35 },
    'node-gemini':   { x: W * 0.78, y: H * 0.35 },
    'node-deepseek': { x: W * 0.50, y: H * 0.20 },
    'node-judge':    { x: W * 0.50, y: H * 0.68 },
  };
  Object.entries(positions).forEach(([id, pos]) => {
    const el = $(id);
    if (el) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; }
  });
}

function newParticle() {
  return {
    x: Math.random() * (NC.W || 800),
    y: Math.random() * (NC.H || 300),
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random() * 0.3 + 0.05,
  };
}

function getNodeCenter(id) {
  const el = $(id);
  const wrap = $('neural-wrap');
  if (!el || !wrap) return null;
  return { x: parseFloat(el.style.left || 0), y: parseFloat(el.style.top || 0) };
}

function renderNeuralLoop() {
  NC.raf = requestAnimationFrame(renderNeuralLoop);
  const ctx = NC.ctx;
  const W = NC.W, H = NC.H;
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  // Draw inter-agent lines
  const nodeIds = ['node-claude','node-gemini','node-deepseek','node-judge'];
  const centers = nodeIds.map(id => getNodeCenter(id)).filter(Boolean);

  // Lines between all agents
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const a = centers[i], b = centers[j];
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, 'rgba(255,255,255,0.05)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1, 'rgba(255,255,255,0.05)');
      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.5;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Draw animated "signal" pulse along lines when debating
  if (S.debating) {
    const t = Date.now() / 1000;
    for (let i = 0; i < centers.length - 1; i++) {
      const a = centers[i], b = centers[centers.length - 1]; // all → judge
      const progress = (Math.sin(t * 1.5 + i * 0.8) + 1) / 2;
      const px = a.x + (b.x - a.x) * progress;
      const py = a.y + (b.y - a.y) * progress;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();

      // Glow
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 12);
      grd.addColorStop(0, 'rgba(255,255,255,0.15)');
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }
  }

  // Background particles
  NC.particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.a})`;
    ctx.fill();

    // Connect close particles
    NC.particles.forEach(p2 => {
      const dx = p.x - p2.x, dy = p.y - p2.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 80) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist/80)})`;
        ctx.lineWidth = 0.4;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function initSettings() {
  $('btn-settings').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click', closeSettings);
  $('settings-cancel').addEventListener('click', closeSettings);
  $('settings-save').addEventListener('click', saveSettings);
  $('modal-settings').addEventListener('click', e => { if (e.target === $('modal-settings')) closeSettings(); });
}

function openSettings() {
  $('set-backend').value = S.backendUrl;
  $('set-model').value   = S.model;
  $('set-name').value    = S.userName;
  $('set-stay').checked  = localStorage.getItem(LS.STAY) !== 'false';
  $('modal-settings').classList.remove('hidden');
}

function closeSettings() { $('modal-settings').classList.add('hidden'); }

function saveSettings() {
  S.backendUrl = $('set-backend').value.trim().replace(/\/$/, '') || CONFIG.BACKEND;
  S.model      = $('set-model').value;
  S.userName   = $('set-name').value.trim() || CONFIG.USER;
  const stay   = $('set-stay').checked;

  localStorage.setItem(LS.BACK,  S.backendUrl);
  localStorage.setItem(LS.MODEL, S.model);
  localStorage.setItem(LS.USER,  S.userName);
  localStorage.setItem(LS.STAY,  stay ? 'true' : 'false');

  const ms = $('model-select');
  if (ms) ms.value = S.model;

  closeSettings();
  toast('SETTINGS SAVED', 'success');
  checkBackend();
}

// ═══════════════════════════════════════════════════════════
// LOCK
// ═══════════════════════════════════════════════════════════
function lockSession() {
  S.authenticated = false;
  localStorage.removeItem(LS.AUTH);
  // Reset connect lines
  ['cl-0','cl-1','cl-2','cl-3'].forEach(id => { const el = $(id); if (el) el.className = 'cl-item'; });
  S.pin = ''; updateSegs(); $('pin-err')?.classList.add('hidden');
  $('s-dash').classList.remove('active');
  go('s-dash', 's-access');
  toast('SESSION LOCKED', 'info');
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function toast(msg, type = 'info', dur = 3000) {
  const box = $('toasts');
  const el  = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, dur);
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const mlabel = id => ({ openai:'GPT-4o', claude:'CLAUDE', gemini:'GEMINI', deepseek:'DEEPSEEK' }[id] || id.toUpperCase());

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initPin();
  runBoot();
});

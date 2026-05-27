/**
 * ═══════════════════════════════════════════════════════════
 * ARIA — script.js
 * Frontend application logic
 *
 * SECURITY NOTE:
 *   No API keys here. All AI calls go through the backend.
 *   The backend (server.js) holds all keys securely in .env
 *
 * DEFAULT PIN: 0002  ← change in the CONFIG block below
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

// ───────────────────────────────────────────────────────────
// CONFIG — safe to edit these values
// ───────────────────────────────────────────────────────────
const CONFIG = {
  PIN:          '0002',                    // ← Change your PIN here
  BACKEND_URL:  'http://localhost:3000',   // ← Your backend server URL
  USER_NAME:    'Mr. Kritesh',             // ← Your name for greeting
  STAY_LOGGED:  true,                      // ← Stay logged in after refresh
};

// ───────────────────────────────────────────────────────────
// APP STATE
// ───────────────────────────────────────────────────────────
const STATE = {
  authenticated: false,
  pin:           '',
  backendOnline: false,
  backendUrl:    CONFIG.BACKEND_URL,
  activeModel:   'openai',
  debateMode:    true,
  chatHistory:   [],          // [{role, text, model, ts}]
  userName:      CONFIG.USER_NAME,
  voicePlaceholder: true,     // future feature
};

// ───────────────────────────────────────────────────────────
// STORAGE KEYS
// ───────────────────────────────────────────────────────────
const LS = {
  AUTH:       'aria_auth',
  CHAT:       'aria_chat',
  BACKEND:    'aria_backend_url',
  MODEL:      'aria_model',
  USERNAME:   'aria_username',
  STAY:       'aria_stay',
};

// ───────────────────────────────────────────────────────────
// DOM shortcut
// ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════
// BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════
const BOOT_STEPS = [
  'Initializing ARIA core intelligence…',
  'Loading multi-model debate engine…',
  'Verifying backend connection…',
  'Strategic analysis modules ready…',
  'ARIA online. Awaiting access credentials.',
];

async function runBoot() {
  const bar   = $('boot-bar');
  const pctEl = $('boot-pct');

  for (let i = 0; i < BOOT_STEPS.length; i++) {
    await sleep(i === 0 ? 150 : 350 + Math.random() * 200);
    const pct = Math.round(((i + 1) / BOOT_STEPS.length) * 100);
    bar.style.width  = pct + '%';
    pctEl.textContent = pct + '%';

    // Mark log lines: previous = done, current = active
    for (let j = 0; j <= i; j++) {
      const el = $(`bl-${j}`);
      if (el) el.className = j === i ? 'log-line active' : 'log-line done';
    }
  }

  await sleep(600);

  // Load persisted settings
  loadPersistedSettings();

  // Check if already authenticated
  const alreadyIn = localStorage.getItem(LS.AUTH) === 'true'
    && localStorage.getItem(LS.STAY) !== 'false';

  if (alreadyIn) {
    STATE.authenticated = true;
    transitionTo('screen-boot', 'screen-connect');
    runConnectSequence();
  } else {
    transitionTo('screen-boot', 'screen-access');
  }
}

function loadPersistedSettings() {
  const savedBackend = localStorage.getItem(LS.BACKEND);
  if (savedBackend) STATE.backendUrl = savedBackend;

  const savedModel = localStorage.getItem(LS.MODEL);
  if (savedModel)   STATE.activeModel = savedModel;

  const savedName = localStorage.getItem(LS.USERNAME);
  if (savedName)    STATE.userName = savedName;

  // Load chat history
  try {
    const raw = localStorage.getItem(LS.CHAT);
    STATE.chatHistory = raw ? JSON.parse(raw) : [];
  } catch { STATE.chatHistory = []; }
}

// ═══════════════════════════════════════════════════════════
// SCREEN TRANSITIONS
// ═══════════════════════════════════════════════════════════
function transitionTo(fromId, toId) {
  const from = $(fromId);
  const to   = $(toId);
  if (from) from.classList.remove('active');
  if (to)   to.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// PIN ACCESS
// ═══════════════════════════════════════════════════════════
function initPinPad() {
  document.querySelectorAll('.pin-key[data-v]').forEach(btn => {
    btn.addEventListener('click', () => enterPinDigit(btn.dataset.v));
  });
  $('pin-clr').addEventListener('click', clearPin);
  $('pin-go').addEventListener('click',  submitPin);

  // Keyboard support
  document.addEventListener('keydown', e => {
    if (!$('screen-access').classList.contains('active')) return;
    if (/^[0-9]$/.test(e.key)) enterPinDigit(e.key);
    if (e.key === 'Backspace')  clearPin();
    if (e.key === 'Enter')      submitPin();
  });

  updateDots();
}

function enterPinDigit(d) {
  if (STATE.pin.length >= 4) return;
  STATE.pin += d;
  updateDots();
  if (STATE.pin.length === 4) setTimeout(submitPin, 180);
}

function clearPin() {
  STATE.pin = '';
  updateDots();
  $('pin-error').classList.add('hidden');
}

function updateDots() {
  for (let i = 0; i < 4; i++) {
    const dot = $(`dot-${i}`);
    dot.className = 'pin-dot' + (i < STATE.pin.length ? ' filled' : '');
  }
}

function submitPin() {
  // PIN is stored in CONFIG.PIN (or overridden in localStorage for future PIN-change feature)
  const correct = localStorage.getItem('aria_pin') || CONFIG.PIN;
  if (STATE.pin === correct) {
    pinSuccess();
  } else {
    pinFail();
  }
}

function pinSuccess() {
  STATE.authenticated = true;
  STATE.pin = '';
  updateDots();
  $('pin-error').classList.add('hidden');

  // Mark as authenticated in localStorage if "stay logged in"
  if (localStorage.getItem(LS.STAY) !== 'false') {
    localStorage.setItem(LS.AUTH, 'true');
  }

  transitionTo('screen-access', 'screen-connect');
  runConnectSequence();
}

function pinFail() {
  // Flash dots red
  for (let i = 0; i < 4; i++) {
    const dot = $(`dot-${i}`);
    dot.className = 'pin-dot filled error';
  }
  $('pin-error').classList.remove('hidden');
  STATE.pin = '';
  setTimeout(() => { updateDots(); $('pin-error').classList.add('hidden'); }, 1600);
}

// ═══════════════════════════════════════════════════════════
// CONNECT SEQUENCE
// ═══════════════════════════════════════════════════════════
async function runConnectSequence() {
  const lines = [
    $('cl-0'), $('cl-1'), $('cl-2'), $('cl-3'),
  ];

  for (let i = 0; i < lines.length; i++) {
    await sleep(400 + i * 380);
    if (i > 0 && lines[i - 1]) setConnectLine(lines[i - 1], 'done');
    setConnectLine(lines[i], 'active');

    // On step 2, actually check the backend
    if (i === 2) await checkBackend();
  }

  await sleep(320);
  setConnectLine(lines[lines.length - 1], 'done');
  await sleep(600);

  transitionTo('screen-connect', 'screen-dashboard');
  onDashboardReady();
}

function setConnectLine(el, state) {
  if (!el) return;
  el.className = `c-line ${state}`;
  const dot = el.querySelector('.c-dot');
  if (dot) dot.className = 'c-dot';
}

// ═══════════════════════════════════════════════════════════
// BACKEND HEALTH CHECK
// ═══════════════════════════════════════════════════════════
async function checkBackend() {
  setBackendStatus('pending', 'CONNECTING');
  try {
    const res = await Promise.race([
      fetch(`${STATE.backendUrl}/api/health`),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    if (res.ok) {
      STATE.backendOnline = true;
      const data = await res.json();
      setBackendStatus('online', 'ONLINE');
      // Show which keys are configured
      if (data.keysConfigured) {
        const missing = Object.entries(data.keysConfigured)
          .filter(([, v]) => !v).map(([k]) => k);
        if (missing.length > 0) {
          showToast(`Missing API keys: ${missing.join(', ')}`, 'error', 5000);
        }
      }
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    STATE.backendOnline = false;
    setBackendStatus('offline', 'OFFLINE');
  }
}

function setBackendStatus(state, label) {
  const dot = $('bs-dot');
  const lbl = $('bs-label');
  if (!dot || !lbl) return;
  dot.className = `bs-dot ${state}`;
  lbl.className = `bs-label ${state}`;
  lbl.textContent = label;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD INIT
// ═══════════════════════════════════════════════════════════
function onDashboardReady() {
  initTopbar();
  initSidebar();
  initChatView();
  initDebateView();
  initSettingsModal();
  renderChatHistory();
  // Periodically re-check backend
  setInterval(checkBackend, 60000);
}

// ═══════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════
function initTopbar() {
  updateGreeting();
  setInterval(updateGreeting, 60000);

  $('btn-settings').addEventListener('click', openSettings);
  $('btn-lock').addEventListener('click',     lockSession);
  $('mobile-menu-btn').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
  });
}

function updateGreeting() {
  const h = new Date().getHours();
  const p = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const el = $('topbar-greeting');
  if (el) el.textContent = `Good ${p}, ${STATE.userName}.`;
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════
function initSidebar() {
  document.querySelectorAll('.sidebar-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('future')) return;
      switchView(btn.dataset.view);
      // Auto-close sidebar on mobile
      if (window.innerWidth <= 768) {
        $('sidebar').classList.remove('open');
      }
    });
  });
}

function switchView(viewId) {
  // Deactivate all views + nav buttons
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn[data-view]').forEach(b => b.classList.remove('active'));

  $(`view-${viewId}`)?.classList.add('active');
  document.querySelector(`.sidebar-btn[data-view="${viewId}"]`)?.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// CHAT VIEW
// ═══════════════════════════════════════════════════════════
function initChatView() {
  $('send-btn').addEventListener('click', handleChatSend);
  $('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  });
  $('btn-clear-chat').addEventListener('click', clearChat);

  // Model selector
  const ms = $('model-select');
  if (ms) {
    ms.value = STATE.activeModel;
    ms.addEventListener('change', () => {
      STATE.activeModel = ms.value;
      localStorage.setItem(LS.MODEL, STATE.activeModel);
      showToast(`Model: ${modelLabel(STATE.activeModel)}`, 'info');
    });
  }

  // Mic button — placeholder for voice input
  $('mic-btn').addEventListener('click', () => {
    showToast('Voice input — coming soon in a future update.', 'info');
  });
}

async function handleChatSend() {
  const input = $('chat-input').value.trim();
  if (!input) return;
  $('chat-input').value = '';

  appendChatMsg('user', input);

  if (!STATE.backendOnline) {
    const offlineMsg = 'Backend is offline. Make sure server.js is running on ' + STATE.backendUrl;
    appendChatMsg('aria', offlineMsg, STATE.activeModel);
    return;
  }

  // Show typing indicator
  const typingId = showTyping();
  $('send-btn').disabled = true;

  try {
    const res = await fetch(`${STATE.backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, model: STATE.activeModel }),
    });

    removeTyping(typingId);
    $('send-btn').disabled = false;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      appendChatMsg('aria', `Error: ${err.error}`, STATE.activeModel);
      return;
    }

    const data = await res.json();
    appendChatMsg('aria', data.reply, data.model);

  } catch (err) {
    removeTyping(typingId);
    $('send-btn').disabled = false;
    appendChatMsg('aria', `Connection error: ${err.message}`, STATE.activeModel);
    setBackendStatus('offline', 'OFFLINE');
    STATE.backendOnline = false;
  }
}

// ── Message rendering ────────────────────────────────────
function appendChatMsg(role, text, model = null, save = true) {
  const ts = Date.now();
  if (save) {
    STATE.chatHistory.push({ role, text, model, ts });
    if (STATE.chatHistory.length > 200) STATE.chatHistory.shift();
    localStorage.setItem(LS.CHAT, JSON.stringify(STATE.chatHistory));
  }
  return renderChatMsg(role, text, model, ts, true);
}

function renderChatHistory() {
  const feed = $('chat-feed');
  if (!feed) return;
  feed.innerHTML = '';
  STATE.chatHistory.forEach(m => renderChatMsg(m.role, m.text, m.model, m.ts, false));
  scrollChat();
}

function renderChatMsg(role, text, model, ts, animate) {
  const feed  = $('chat-feed');
  if (!feed) return null;

  const isAria = role === 'aria';
  const div    = document.createElement('div');
  div.className = `msg ${role}`;
  if (!animate) div.style.animation = 'none';

  const timeStr = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const badge   = (isAria && model) ? `<div class="msg-model-badge">${modelLabel(model)}</div>` : '';

  div.innerHTML = `
    <div class="msg-avatar">${isAria ? 'AI' : 'YOU'}</div>
    <div class="msg-body">
      <div class="msg-label">${isAria ? 'ARIA' : 'YOU'}</div>
      <div class="msg-text">${escHtml(text)}</div>
      ${badge}
      <div class="msg-time">${timeStr}</div>
    </div>
  `;
  feed.appendChild(div);
  scrollChat();
  return div;
}

function showTyping() {
  const feed = $('chat-feed');
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.id    = id;
  div.className = 'msg aria typing-msg';
  div.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-body">
      <div class="msg-label">ARIA</div>
      <div class="msg-text"><span class="tdot"></span><span class="tdot"></span><span class="tdot"></span></div>
    </div>
  `;
  feed.appendChild(div);
  scrollChat();
  return id;
}

function removeTyping(id) { $(id)?.remove(); }

function scrollChat() {
  requestAnimationFrame(() => {
    const f = $('chat-feed');
    if (f) f.scrollTop = f.scrollHeight;
  });
}

function clearChat() {
  STATE.chatHistory = [];
  localStorage.removeItem(LS.CHAT);
  $('chat-feed').innerHTML = '';
  addSysLine($('chat-feed'), 'Chat cleared.');
  showToast('Chat history cleared', 'info');
}

function addSysLine(feed, text) {
  const d = document.createElement('div');
  d.className = 'sys-line'; d.textContent = text;
  feed.appendChild(d);
  scrollChat();
}

// ═══════════════════════════════════════════════════════════
// DEBATE VIEW
// ═══════════════════════════════════════════════════════════
function initDebateView() {
  // Debate mode toggle
  const toggle = $('debate-toggle');
  const statusText = $('debate-status-text');

  toggle.addEventListener('change', () => {
    STATE.debateMode = toggle.checked;
    const offMsg  = $('debate-off-msg');
    const debArea = $('debate-area');

    if (STATE.debateMode) {
      offMsg.classList.add('hidden');
      debArea.classList.remove('hidden');
      statusText.textContent = 'ON';
      statusText.className = 'debate-toggle-status on';
    } else {
      offMsg.classList.remove('hidden');
      debArea.classList.add('hidden');
      statusText.textContent = 'OFF';
      statusText.className = 'debate-toggle-status off';
    }
  });

  // Initialize state
  statusText.textContent = 'ON';
  statusText.className = 'debate-toggle-status on';

  // Debate send
  $('debate-send-btn').addEventListener('click', handleDebateSend);
  $('debate-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDebateSend(); }
  });
}

async function handleDebateSend() {
  const question = $('debate-input').value.trim();
  if (!question) return;
  $('debate-input').value = '';

  if (!STATE.debateMode) {
    showToast('Enable Debate Mode first using the toggle above.', 'error');
    return;
  }

  if (!STATE.backendOnline) {
    showToast('Backend is offline. Start server.js first.', 'error');
    return;
  }

  // Hide placeholder
  const placeholder = $('debate-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // Create debate round container
  const round = createDebateRound(question);
  $('debate-area').appendChild(round.el);
  $('debate-area').scrollTop = $('debate-area').scrollHeight;

  $('debate-send-btn').disabled = true;

  try {
    const res = await fetch(`${STATE.backendUrl}/api/debate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      setDebateError(round, err.error || 'Debate request failed.');
      $('debate-send-btn').disabled = false;
      return;
    }

    const data = await res.json();
    // Stream each agent's response into their card
    await streamToCard(round.claudeContent,   data.claude);
    await streamToCard(round.geminiContent,   data.gemini);
    await streamToCard(round.deepseekContent, data.deepseek);
    await streamToCard(round.judgeContent,    data.openai_judgment);

    $('debate-area').scrollTop = $('debate-area').scrollHeight;

  } catch (err) {
    setDebateError(round, `Connection error: ${err.message}`);
    setBackendStatus('offline', 'OFFLINE');
    STATE.backendOnline = false;
  }

  $('debate-send-btn').disabled = false;
}

function createDebateRound(question) {
  const el = document.createElement('div');
  el.className = 'debate-round';

  el.innerHTML = `
    <div class="debate-question-label">ANALYSIS REQUEST: ${escHtml(question)}</div>
    <div class="agents-grid">

      <!-- Claude card -->
      <div class="agent-card claude loading">
        <div class="agent-header">
          <div class="agent-icon">CL</div>
          <div class="agent-name">Claude</div>
          <span class="agent-badge">Anthropic</span>
        </div>
        <div class="agent-content claude-content">
          <span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>
        </div>
      </div>

      <!-- Gemini card -->
      <div class="agent-card gemini loading">
        <div class="agent-header">
          <div class="agent-icon">GM</div>
          <div class="agent-name">Gemini</div>
          <span class="agent-badge">Google</span>
        </div>
        <div class="agent-content gemini-content">
          <span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>
        </div>
      </div>

      <!-- DeepSeek card -->
      <div class="agent-card deepseek loading">
        <div class="agent-header">
          <div class="agent-icon">DS</div>
          <div class="agent-name">DeepSeek</div>
          <span class="agent-badge">DeepSeek AI</span>
        </div>
        <div class="agent-content deepseek-content">
          <span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>
        </div>
      </div>

      <!-- OpenAI Judge card -->
      <div class="agent-card judge loading">
        <div class="agent-header">
          <div class="agent-icon">AI</div>
          <div class="agent-name">OpenAI — Final Judgment</div>
          <span class="agent-badge judge">VERDICT</span>
        </div>
        <div class="agent-content judge-content">
          <span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>
        </div>
      </div>

    </div>
  `;

  return {
    el,
    claudeContent:   el.querySelector('.claude-content'),
    geminiContent:   el.querySelector('.gemini-content'),
    deepseekContent: el.querySelector('.deepseek-content'),
    judgeContent:    el.querySelector('.judge-content'),
  };
}

async function streamToCard(contentEl, text, speed = 14) {
  contentEl.innerHTML = '';
  contentEl.classList.add('streaming');
  const chars = text.split('');
  for (let i = 0; i < chars.length; i++) {
    contentEl.textContent += chars[i];
    if (i % 6 === 0) {
      $('debate-area').scrollTop = $('debate-area').scrollHeight;
      await sleep(speed + Math.random() * 6);
    }
  }
  contentEl.classList.remove('streaming');
}

function setDebateError(round, message) {
  [round.claudeContent, round.geminiContent, round.deepseekContent, round.judgeContent].forEach(el => {
    el.textContent = message;
    el.style.color = 'var(--red)';
  });
}

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function initSettingsModal() {
  $('btn-settings').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click',  closeSettings);
  $('settings-cancel').addEventListener('click', closeSettings);
  $('settings-save').addEventListener('click',   saveSettings);
  $('modal-settings').addEventListener('click', e => {
    if (e.target === $('modal-settings')) closeSettings();
  });
}

function openSettings() {
  $('set-backend-url').value    = STATE.backendUrl;
  $('set-default-model').value  = STATE.activeModel;
  $('set-username').value       = STATE.userName;
  $('set-stay-in').checked      = localStorage.getItem(LS.STAY) !== 'false';
  $('modal-settings').classList.remove('hidden');
}

function closeSettings() { $('modal-settings').classList.add('hidden'); }

function saveSettings() {
  STATE.backendUrl  = $('set-backend-url').value.trim().replace(/\/$/, '') || CONFIG.BACKEND_URL;
  STATE.activeModel = $('set-default-model').value;
  STATE.userName    = $('set-username').value.trim() || CONFIG.USER_NAME;

  const stayIn = $('set-stay-in').checked;
  localStorage.setItem(LS.STAY,    stayIn ? 'true' : 'false');
  localStorage.setItem(LS.BACKEND, STATE.backendUrl);
  localStorage.setItem(LS.MODEL,   STATE.activeModel);
  localStorage.setItem(LS.USERNAME,STATE.userName);

  // Sync model dropdown in chat view
  const ms = $('model-select');
  if (ms) ms.value = STATE.activeModel;

  updateGreeting();
  closeSettings();
  showToast('Settings saved', 'success');
  checkBackend(); // Re-check with new URL
}

// ═══════════════════════════════════════════════════════════
// SESSION LOCK
// ═══════════════════════════════════════════════════════════
function lockSession() {
  STATE.authenticated = false;
  localStorage.removeItem(LS.AUTH);

  // Reset connect lines for next login
  ['cl-0','cl-1','cl-2','cl-3'].forEach(id => {
    const el = $(id);
    if (el) { el.className = 'c-line pending'; }
  });

  // Hide dashboard, show access
  $('screen-dashboard').classList.remove('active');
  STATE.pin = '';
  updateDots();
  $('pin-error').classList.add('hidden');
  transitionTo('screen-dashboard', 'screen-access');
  showToast('Session locked', 'info');
}

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
function showToast(msg, type = 'info', duration = 3200) {
  const container = $('toasts');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function modelLabel(id) {
  const map = {
    openai:   'GPT-4o',
    claude:   'Claude 3.5',
    gemini:   'Gemini 1.5',
    deepseek: 'DeepSeek',
  };
  return map[id] || id;
}

// ═══════════════════════════════════════════════════════════
// INIT — runs when page loads
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initPinPad();
  runBoot();
});

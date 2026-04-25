/* =========================================================
   ARIA — script.js
   Autonomous Reasoning & Intelligence Assistant
   ========================================================= */

'use strict';

// ── CONFIG ──────────────────────────────────────────────
const CFG = {
  DEBATE_ENDPOINT: '/api/debate',  // POST — backend
  BOOT_DURATION:   2400,
  USER_NAME:       'Kritesh',
};

// ── STATE ────────────────────────────────────────────────
const S = {
  voices:         [],
  selectedVoice:  null,
  rate:           1.0,
  pitch:          0.9,
  voiceOut:       true,
  listening:      false,
  recognition:    null,
  debating:       false,
  history:        [],          // {role, text}
};

// ── DOM REFS ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

const D = {
  boot:          $('boot-screen'),
  bootBar:       $('boot-bar'),
  bootStatus:    $('boot-status'),
  app:           $('app'),
  messages:      $('messages'),
  chatArea:      $('chat-area'),
  input:         $('user-input'),
  sendBtn:       $('send-btn'),
  micBtn:        $('mic-btn'),
  clearBtn:      $('clear-btn'),
  vsBtn:         $('voice-settings-btn'),
  voiceModal:    $('voice-modal'),
  modalClose:    $('modal-close'),
  voiceSelect:   $('voice-select'),
  rateSlider:    $('rate-slider'),
  pitchSlider:   $('pitch-slider'),
  rateVal:       $('rate-val'),
  pitchVal:      $('pitch-val'),
  voiceOutToggle:$('voice-output-toggle'),
  testVoiceBtn:  $('test-voice-btn'),
  debateTemplate:$('debate-template'),
};

// =========================================================
// BOOT SEQUENCE
// =========================================================
const BOOT_STEPS = [
  [0,   'Initializing core systems…'],
  [20,  'Loading debate engine…'],
  [45,  'Calibrating agent protocols…'],
  [65,  'Connecting automation core…'],
  [80,  'Synthesizing voice subsystem…'],
  [95,  'Finalizing interface…'],
  [100, 'ARIA online.'],
];

async function runBoot() {
  for (const [pct, msg] of BOOT_STEPS) {
    await sleep(pct === 0 ? 100 : 320 + Math.random() * 160);
    D.bootBar.style.width = pct + '%';
    D.bootStatus.textContent = msg;
  }
  await sleep(500);
  D.boot.classList.add('fade-out');
  await sleep(650);
  D.app.classList.remove('hidden');
  initVoices();
  loadSettings();
  greetUser();
}

// =========================================================
// GREETING
// =========================================================
function greetUser() {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const greetings = [
    `Good ${period}, Mr. ${CFG.USER_NAME}. ARIA is online. Debate engine and automation core are ready.`,
    `Welcome back, ${period === 'evening' ? 'sir' : 'Mr. ' + CFG.USER_NAME}. Systems are operational.`,
    `Good ${period}, sir. All agents are standing by.`,
    `Welcome back, Mr. ${CFG.USER_NAME}. Good ${period}. ARIA systems nominal.`,
  ];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  setTimeout(() => {
    addMessage('aria', greeting);
    speak(greeting);
  }, 400);
}

// =========================================================
// VOICE SYNTHESIS
// =========================================================
function initVoices() {
  const load = () => {
    S.voices = speechSynthesis.getVoices();
    buildVoiceDropdown();
    autoSelectVoice();
  };
  if (speechSynthesis.getVoices().length) { load(); }
  speechSynthesis.onvoiceschanged = load;
}

function buildVoiceDropdown() {
  D.voiceSelect.innerHTML = '';
  S.voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    D.voiceSelect.appendChild(opt);
  });
}

function autoSelectVoice() {
  const saved = localStorage.getItem('aria_voice');
  if (saved !== null) {
    const idx = parseInt(saved);
    if (S.voices[idx]) {
      S.selectedVoice = S.voices[idx];
      D.voiceSelect.value = idx;
      return;
    }
  }
  // Priority: deep male English voices
  const preferred = [
    'Google UK English Male',
    'Google US English',
    'Alex',
    'Daniel',
    'Fred',
    'Samantha',
  ];
  for (const name of preferred) {
    const v = S.voices.find(v => v.name.includes(name));
    if (v) { S.selectedVoice = v; D.voiceSelect.value = S.voices.indexOf(v); return; }
  }
  // fallback: first English male
  const eng = S.voices.find(v => /en/i.test(v.lang));
  if (eng) { S.selectedVoice = eng; D.voiceSelect.value = S.voices.indexOf(eng); }
  else if (S.voices[0]) { S.selectedVoice = S.voices[0]; D.voiceSelect.value = 0; }
}

function speak(text) {
  if (!S.voiceOut) return;
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();

  // Split on sentence endings for natural pausing
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let idx = 0;

  const speakNext = () => {
    if (idx >= sentences.length) return;
    const utt = new SpeechSynthesisUtterance(sentences[idx].trim());
    if (S.selectedVoice) utt.voice = S.selectedVoice;
    utt.rate  = S.rate;
    utt.pitch = S.pitch;
    utt.volume = 1;
    utt.onend = () => { idx++; speakNext(); };
    speechSynthesis.speak(utt);
    idx++;
  };

  speakNext();
}

// =========================================================
// VOICE INPUT (Web Speech API)
// =========================================================
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.continuous     = false;
  rec.interimResults = false;
  rec.lang           = 'en-US';

  rec.onresult = e => {
    const transcript = e.results[0][0].transcript.trim();
    D.input.value = transcript;
    handleSend();
  };
  rec.onerror = () => stopListening();
  rec.onend   = () => {
    if (S.listening) { rec.start(); } // auto-restart if still in voice mode
  };
  return rec;
}

function startListening() {
  if (!S.recognition) S.recognition = initRecognition();
  if (!S.recognition) {
    addMessage('aria', 'Voice input is not supported in this browser. Please use Chrome or Edge.');
    return;
  }
  S.listening = true;
  D.micBtn.classList.add('listening');
  S.recognition.start();
}

function stopListening() {
  S.listening = false;
  D.micBtn.classList.remove('listening');
  if (S.recognition) { try { S.recognition.stop(); } catch {} }
}

// =========================================================
// MESSAGE RENDERING
// =========================================================
function addMessage(role, text, type = 'text') {
  const isAria = role === 'aria';
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = isAria ? 'AI' : 'YOU';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = isAria ? 'ARIA' : 'YOU';

  const content = document.createElement('div');
  content.className = 'msg-text';

  if (type === 'html') {
    content.innerHTML = text;
  } else {
    content.textContent = text;
  }

  body.appendChild(sender);
  body.appendChild(content);
  msg.appendChild(avatar);
  msg.appendChild(body);
  D.messages.appendChild(msg);
  scrollBottom();

  S.history.push({ role, text });
  return { msg, content };
}

function addTyping() {
  const { msg, content } = addMessage('aria', '');
  content.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  return { msg, content };
}

function addCmdResult(icon, text) {
  const { content } = addMessage('aria', '');
  content.innerHTML = `<div class="cmd-result">${icon} ${text}</div>`;
}

function addDebateCard() {
  const { msg, content } = addMessage('aria', '');
  const tpl = D.debateTemplate.content.cloneNode(true);
  const card = tpl.querySelector('.debate-card');
  content.appendChild(card);
  scrollBottom();
  return card;
}

function addSysMsg(text) {
  const div = document.createElement('div');
  div.className = 'sys-msg';
  div.textContent = text;
  D.messages.appendChild(div);
  scrollBottom();
}

function scrollBottom() {
  requestAnimationFrame(() => {
    D.chatArea.scrollTop = D.chatArea.scrollHeight;
  });
}

// =========================================================
// AUTOMATION COMMANDS
// =========================================================
const ICON = {
  open:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M10 3h3v3M13 3L8 8"/><rect x="2" y="2" width="7" height="7" rx="1"/></svg>`,
  search: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="7" cy="7" r="4"/><line x1="10" y1="10" x2="14" y2="14"/></svg>`,
  clock:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/></svg>`,
  clear:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><polyline points="2 4 4 4 14 4"/><path d="M12.5 4l-.7 9a1 1 0 01-1 .9H5.2a1 1 0 01-1-.9L3.5 4"/></svg>`,
  mic:    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><rect x="5" y="1" width="6" height="8" rx="3"/><path d="M3 8a5 5 0 0010 0"/><line x1="8" y1="13" x2="8" y2="15"/></svg>`,
};

function tryCommand(input) {
  const lower = input.toLowerCase().trim();

  // ── open website ──────────────────────────────
  const openMap = {
    'youtube':  'https://youtube.com',
    'google':   'https://google.com',
    'gmail':    'https://mail.google.com',
    'twitter':  'https://x.com',
    'x':        'https://x.com',
    'instagram':'https://instagram.com',
    'reddit':   'https://reddit.com',
    'github':   'https://github.com',
    'netflix':  'https://netflix.com',
    'spotify':  'https://open.spotify.com',
    'chatgpt':  'https://chat.openai.com',
    'wikipedia':'https://wikipedia.org',
    'amazon':   'https://amazon.com',
  };
  for (const [key, url] of Object.entries(openMap)) {
    if (lower === `open ${key}` || lower === `go to ${key}` || lower === `launch ${key}`) {
      window.open(url, '_blank');
      addCmdResult(ICON.open, `Opened ${capitalize(key)}.`);
      speak(`Opening ${key}.`);
      return true;
    }
  }

  // ── search YouTube ────────────────────────────
  const ytSearch = lower.match(/^(?:search youtube|youtube search)\s+(?:for\s+)?(.+)$/);
  if (ytSearch) {
    const q = ytSearch[1];
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
    addCmdResult(ICON.search, `Searching YouTube for "${q}".`);
    speak(`Searching YouTube for ${q}.`);
    return true;
  }

  // ── search Google ─────────────────────────────
  const gSearch = lower.match(/^(?:search google|google search|search)\s+(?:for\s+)?(.+)$/);
  if (gSearch) {
    const q = gSearch[1];
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
    addCmdResult(ICON.search, `Searching Google for "${q}".`);
    speak(`Searching Google for ${q}.`);
    return true;
  }

  // ── date ──────────────────────────────────────
  if (/^(what'?s? (?:today'?s? )?date|today'?s date|show (?:today'?s )?date)/.test(lower)) {
    const d = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    addCmdResult(ICON.clock, `Today is ${d}.`);
    speak(`Today is ${d}.`);
    return true;
  }

  // ── time ──────────────────────────────────────
  if (/^(what(?:'?s| is) (?:the )?time|current time|show time|what time is it)/.test(lower)) {
    const t = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    addCmdResult(ICON.clock, `Current time: ${t}.`);
    speak(`The time is ${t}.`);
    return true;
  }

  // ── clear chat ────────────────────────────────
  if (/^(clear(?: chat| history| all)?|reset chat)$/.test(lower)) {
    clearChat();
    return true;
  }

  // ── voice mode ───────────────────────────────
  if (/start voice(?: mode)?/.test(lower)) {
    addCmdResult(ICON.mic, 'Voice mode activated. Listening…');
    speak('Voice mode activated.');
    setTimeout(startListening, 600);
    return true;
  }
  if (/stop voice(?: mode)?/.test(lower)) {
    stopListening();
    addCmdResult(ICON.mic, 'Voice mode deactivated.');
    speak('Voice mode off.');
    return true;
  }

  return false;
}

// =========================================================
// DEBATE SYSTEM (mock agents — replace with real backend)
// =========================================================
async function runDebate(question) {
  if (S.debating) return;
  S.debating = true;

  const card = addDebateCard();
  const agents = card.querySelectorAll('.agent-block');
  const judgeContent = card.querySelector('.judge-content');

  // Try real backend first; fall back to mock
  let result = null;
  try {
    const res = await Promise.race([
      fetch(CFG.DEBATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);
    if (res.ok) result = await res.json();
  } catch (_) { /* backend not available — use mock */ }

  if (result) {
    // Real backend: {strategist, critic, realist, judge}
    const keys = ['strategist', 'critic', 'realist'];
    for (const [i, key] of keys.entries()) {
      await streamText(agents[i].querySelector('.agent-content'), result[key] || '—');
      agents[i].classList.add('loaded');
    }
    await streamText(judgeContent, result.judge || '—');
  } else {
    await mockDebate(question, agents, judgeContent);
  }

  const verdict = judgeContent.textContent;
  judgeContent.classList.remove('stream-cursor');
  speak(verdict);
  S.debating = false;
}

async function mockDebate(question, agents, judgeContent) {
  // Simulate three agent perspectives with stylized mock responses
  const responses = buildMockDebate(question);
  const keys = ['strategist', 'critic', 'realist'];

  for (const [i, key] of keys.entries()) {
    await sleep(300 + i * 200);
    await streamText(agents[i].querySelector('.agent-content'), responses[key]);
    agents[i].classList.add('loaded');
  }

  await sleep(400);
  await streamText(judgeContent, responses.judge);
}

function buildMockDebate(question) {
  const q = question.toLowerCase();

  // Very light context-aware mock; real answers come from backend
  const strategist = `From a strategic standpoint, approaching "${question}" requires identifying the highest-leverage angle first. Consider the long-term compounding effects of the decision and which path creates the most optionality. Prioritize actions that are reversible early, irreversible only when confidence is high.`;

  const critic = `The framing of this question may contain hidden assumptions. Specifically, "${question}" presupposes a fixed context that may not hold. Consider: what are the failure modes? What evidence would prove this approach wrong? Stress-test each premise before committing.`;

  const realist = `Practically speaking, the answer depends on current constraints — time, resources, and environment. Abstract reasoning breaks down without implementation reality. The most viable path balances ideal outcomes with what's executable given real-world friction.`;

  const judge = `After weighing all perspectives on "${question}": The strategic view highlights optionality and leverage. The critic exposes false assumptions worth validating. The realist grounds execution in constraints. My verdict — begin with a low-cost experiment that tests the core assumption. Gather signal before scaling. This is the move that survives all three critiques.`;

  return { strategist, critic, realist, judge };
}

// =========================================================
// STREAM TEXT
// =========================================================
async function streamText(el, text, speed = 18) {
  el.classList.add('stream-cursor');
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    if (i % 4 === 0) scrollBottom();
    await sleep(speed + Math.random() * 8);
  }
  el.classList.remove('stream-cursor');
  scrollBottom();
}

// =========================================================
// SEND HANDLER
// =========================================================
async function handleSend() {
  const raw = D.input.value.trim();
  if (!raw) return;
  D.input.value = '';

  addMessage('user', raw);

  // 1. Check automation commands
  if (tryCommand(raw)) return;

  // 2. Run debate
  addMessage('aria', `Running multi-agent analysis on: "${raw}"`, 'text');
  await runDebate(raw);
}

// =========================================================
// SETTINGS: LOAD / SAVE / BIND
// =========================================================
function loadSettings() {
  const r = parseFloat(localStorage.getItem('aria_rate')  ?? '1.0');
  const p = parseFloat(localStorage.getItem('aria_pitch') ?? '0.9');
  const vo = localStorage.getItem('aria_voice_out') !== 'false';

  S.rate = r; S.pitch = p; S.voiceOut = vo;
  D.rateSlider.value  = r;
  D.pitchSlider.value = p;
  D.rateVal.textContent  = r.toFixed(2);
  D.pitchVal.textContent = p.toFixed(2);
  D.voiceOutToggle.checked = vo;
}

function saveSettings() {
  localStorage.setItem('aria_rate',      S.rate);
  localStorage.setItem('aria_pitch',     S.pitch);
  localStorage.setItem('aria_voice_out', S.voiceOut);
  if (S.selectedVoice) {
    localStorage.setItem('aria_voice', S.voices.indexOf(S.selectedVoice));
  }
}

// =========================================================
// CLEAR CHAT
// =========================================================
function clearChat() {
  D.messages.innerHTML = '';
  S.history = [];
  addSysMsg('Chat cleared.');
  speak('Chat cleared.');
}

// =========================================================
// UTILITY
// =========================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

// =========================================================
// EVENT LISTENERS
// =========================================================
function bindEvents() {
  // Send
  D.sendBtn.addEventListener('click', handleSend);
  D.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }});

  // Mic toggle
  D.micBtn.addEventListener('click', () => {
    if (S.listening) stopListening();
    else startListening();
  });

  // Clear
  D.clearBtn.addEventListener('click', clearChat);

  // Voice settings modal
  D.vsBtn.addEventListener('click',    () => D.voiceModal.classList.remove('hidden'));
  D.modalClose.addEventListener('click', () => D.voiceModal.classList.add('hidden'));
  D.voiceModal.addEventListener('click', e => { if (e.target === D.voiceModal) D.voiceModal.classList.add('hidden'); });

  // Rate slider
  D.rateSlider.addEventListener('input', () => {
    S.rate = parseFloat(D.rateSlider.value);
    D.rateVal.textContent = S.rate.toFixed(2);
    saveSettings();
  });

  // Pitch slider
  D.pitchSlider.addEventListener('input', () => {
    S.pitch = parseFloat(D.pitchSlider.value);
    D.pitchVal.textContent = S.pitch.toFixed(2);
    saveSettings();
  });

  // Voice select
  D.voiceSelect.addEventListener('change', () => {
    S.selectedVoice = S.voices[D.voiceSelect.value] || null;
    saveSettings();
  });

  // Voice output toggle
  D.voiceOutToggle.addEventListener('change', () => {
    S.voiceOut = D.voiceOutToggle.checked;
    if (!S.voiceOut) speechSynthesis.cancel();
    saveSettings();
  });

  // Test voice
  D.testVoiceBtn.addEventListener('click', () => {
    speak(`ARIA voice test. Rate ${S.rate.toFixed(2)}, pitch ${S.pitch.toFixed(2)}. Systems nominal.`);
  });
}

// =========================================================
// INIT
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  runBoot();
});

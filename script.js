/*
  ARIA v6 — script.js
  © Kritesh Dhungel 2025. All rights reserved.
  Unauthorized redistribution prohibited.
*/
'use strict';

/* ═══════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════ */
const CFG = {
  PIN:     '0002',
  BACKEND: 'http://localhost:3000',
  USER:    'Mr. Kritesh',
};

const MODE_META = {
  ask:      { label:'Ask ARIA',     desc:'General AI reasoning',          color:'#6366f1' },
  debate:   { label:'Debate',       desc:'Multi-model AI analysis',       color:'#f43f5e' },
  code:     { label:'Code Helper',  desc:'Code review & generation',      color:'#10b981' },
  strategy: { label:'Strategy',     desc:'Strategic planning & GTM',      color:'#f59e0b' },
  research: { label:'Research',     desc:'Deep research & analysis',      color:'#3b82f6' },
  decision: { label:'Decision',     desc:'Decision engine & trade-offs',  color:'#a855f7' },
};

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const S = {
  pin:'', authed:false,
  backendUrl: CFG.BACKEND,
  backendOnline: false,
  model: 'openai',
  mode: 'ask',
  chat: [], debates: 0,
  userName: CFG.USER,
  debating: false,
  fallback: false,
  voiceActive: false,
  recognition: null,
  soundOn: false,
  sessions: 0,
};

const LS = {
  AUTH:'a6_auth', CHAT:'a6_chat', BACK:'a6_back',
  MOD:'a6_mod',   USER:'a6_usr',  STAY:'a6_stay',
  DEB:'a6_deb',   FIRST:'a6_first', SND:'a6_snd',
};

const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelector(sel);

/* ═══════════════════════════════════════════
   SOUND SYSTEM (Web Audio API — no files)
═══════════════════════════════════════════ */
let audioCtx = null;
function initAudio() {
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
}
function playTone(freq, duration, type='sine', vol=0.06) {
  if (!S.soundOn || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch {}
}
const SFX = {
  send:      () => playTone(880, .12, 'sine', .05),
  receive:   () => { playTone(440, .08); setTimeout(() => playTone(660, .1), 90); },
  mode:      () => playTone(550, .15, 'triangle', .04),
  judgment:  () => { playTone(330, .12); setTimeout(() => playTone(440, .1), 100); setTimeout(() => playTone(550, .2), 200); },
  error:     () => playTone(220, .2, 'sawtooth', .04),
};

/* ═══════════════════════════════════════════
   FALLBACK ENGINE
═══════════════════════════════════════════ */
const FB = {
  math(t) {
    const lo = t.toLowerCase();
    const p = lo.match(/(\d+\.?\d*)\s*%\s*of\s*(\d+\.?\d*)/i);
    if (p) return `${p[1]}% of ${p[2]} = **${((+p[1]/100)*+p[2]).toFixed(4).replace(/\.?0+$/,'')}**`;
    const c2f = lo.match(/(-?\d+\.?\d*)\s*°?c\s+to\s+f/i);
    if (c2f) return `${c2f[1]}°C = **${((+c2f[1]*9/5)+32).toFixed(1)}°F**`;
    const f2c = lo.match(/(-?\d+\.?\d*)\s*°?f\s+to\s+c/i);
    if (f2c) return `${f2c[1]}°F = **${(((+f2c[1])-32)*5/9).toFixed(1)}°C**`;
    const km  = lo.match(/(\d+\.?\d*)\s*km\s+to\s+mi/i);
    if (km) return `${km[1]} km = **${(+km[1]*0.6214).toFixed(3)} miles**`;
    const mi  = lo.match(/(\d+\.?\d*)\s*mi\w*\s+to\s+km/i);
    if (mi) return `${mi[1]} miles = **${(+mi[1]*1.6093).toFixed(3)} km**`;
    const expr = t.replace(/[^0-9+\-*/().\s]/g,'').trim();
    if (/^[\d\s+\-*/().]+$/.test(expr) && expr.length>1) {
      try {
        const r = Function('"use strict";return('+expr+')')();
        if (typeof r==='number' && isFinite(r)) return `${expr.trim()} = **${r%1===0?r:+r.toFixed(6)}**`;
      } catch {}
    }
    return null;
  },
  cmd(t) {
    const lo = t.toLowerCase().trim();
    const sites = {youtube:'https://youtube.com',google:'https://google.com',gmail:'https://mail.google.com',github:'https://github.com',reddit:'https://reddit.com',spotify:'https://open.spotify.com',netflix:'https://netflix.com',twitter:'https://x.com',x:'https://x.com',instagram:'https://instagram.com',amazon:'https://amazon.com',chatgpt:'https://chat.openai.com'};
    for (const [n,u] of Object.entries(sites)) {
      if (new RegExp(`(open|launch|go to)\\s+${n}`,'i').test(lo)) {
        window.open(u,'_blank');
        return `Opening **${n[0].toUpperCase()+n.slice(1)}**…`;
      }
    }
    const yt = lo.match(/search youtube(?:\s+for)?\s+(.+)/);
    if (yt) { window.open(`https://youtube.com/results?search_query=${encodeURIComponent(yt[1])}`,'_blank'); return `Searching YouTube for **"${yt[1]}"**`; }
    const g  = lo.match(/search(?:\s+google)?(?:\s+for)?\s+(.+)/);
    if (g)  { window.open(`https://google.com/search?q=${encodeURIComponent(g[1])}`,'_blank'); return `Searching Google for **"${g[1]}"**`; }
    if (/what(?:'?s| is).*time|current time/i.test(lo)) return `Current time: **${new Date().toLocaleTimeString()}**`;
    if (/today'?s? date|what day/i.test(lo)) return `Today: **${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}**`;
    if (/^(clear chat|reset)$/i.test(lo)) { clearChat(); return null; }
    return null;
  },
  general(t) {
    const lo = t.toLowerCase();
    const h  = new Date().getHours();
    const p  = h<12?'morning':h<18?'afternoon':'evening';
    if (/^(hi|hey|hello|howdy|yo)\b/i.test(lo))
      return `Good ${p}, ${S.userName}. ARIA is running in local intelligence mode — cloud AI is currently unavailable. I can still handle math, conversions, web commands, and strategic frameworks. What do you need?`;
    if (/how are you/i.test(lo)) return 'Systems operational. Running local intelligence mode. What can I reason through for you?';
    if (/what can you do|help/i.test(lo))
      return `**Local Intelligence Mode active.** I can:\n• Math & calculations: "50% of 200", "100 * 3.14"\n• Unit conversions: °C↔°F, km↔miles\n• Web commands: "open YouTube", "search Google for X"\n• Time & date\n• Strategic frameworks & reasoning\n\nConnect your backend + API keys for full multi-model AI intelligence.`;
    return `I'm in local intelligence mode — cloud AI temporarily unavailable.\n\nTry: math ("100 * 1.08"), conversions ("20°C to F"), or "open GitHub".\n\nFor full AI reasoning, connect your backend with valid API keys.`;
  },
  handle(t) {
    const c = this.cmd(t);   if (c !== null) return c;
    const m = this.math(t);  if (m !== null) return `📐 ${m}`;
    return this.general(t);
  },
};

/* ═══════════════════════════════════════════
   BACKGROUND CANVAS
═══════════════════════════════════════════ */
function initBgCanvas() {
  const c = $('bg-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts = [];
  const resize = () => {
    W = c.width  = window.innerWidth;
    H = c.height = window.innerHeight;
    pts = Array.from({length:50}, () => ({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
      r:Math.random()*.9+.2,
    }));
  };
  resize(); window.addEventListener('resize', resize);
  let mx=W/2, my=H/2;
  window.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });
  function draw() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      // Subtle mouse attraction
      const dx=mx-p.x, dy=my-p.y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<150){ p.x+=dx/d*.08; p.y+=dy/d*.08; }
      pts.forEach(q => {
        const dd=Math.hypot(p.x-q.x,p.y-q.y);
        if(dd<80) {
          ctx.beginPath();
          ctx.strokeStyle=`rgba(99,102,241,${.06*(1-dd/80)})`;
          ctx.lineWidth=.4; ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
        }
      });
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(99,102,241,0.25)'; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════
   PIN / AUTH
═══════════════════════════════════════════ */
function initPin() {
  document.querySelectorAll('.npk[data-v]').forEach(b => b.addEventListener('click', () => pinD(b.dataset.v)));
  $('npk-del').addEventListener('click', () => { S.pin=S.pin.slice(0,-1); updPin(); });
  $('npk-go').addEventListener('click', pinCheck);
  document.addEventListener('keydown', e => {
    if (!$('auth-screen').classList.contains('active')) return;
    if (/^[0-9]$/.test(e.key)) pinD(e.key);
    if (e.key==='Backspace') { S.pin=S.pin.slice(0,-1); updPin(); }
    if (e.key==='Enter') pinCheck();
  });
}
function pinD(d) {
  if (S.pin.length>=4) return;
  S.pin+=d; updPin();
  if (S.pin.length===4) setTimeout(pinCheck,200);
}
function updPin() {
  for (let i=0;i<4;i++) {
    const el=$(`pv${i}`); if(!el) return;
    el.className='pv-dot'+(i<S.pin.length?' filled':'');
  }
}
function pinCheck() {
  const correct = localStorage.getItem('a6_pin') || CFG.PIN;
  if (S.pin===correct) {
    S.authed=true; S.pin='';
    if (localStorage.getItem(LS.STAY)!=='false') localStorage.setItem(LS.AUTH,'true');
    $('auth-screen').classList.remove('active');
    $('auth-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
    initApp();
  } else {
    for (let i=0;i<4;i++) $(`pv${i}`).classList.add('err');
    $('auth-err').classList.remove('hidden');
    S.pin='';
    setTimeout(() => { updPin(); $('auth-err').classList.add('hidden'); }, 1500);
  }
}

/* ═══════════════════════════════════════════
   APP INIT
═══════════════════════════════════════════ */
function loadSettings() {
  const b=localStorage.getItem(LS.BACK);  if(b) S.backendUrl=b;
  const m=localStorage.getItem(LS.MOD);   if(m) S.model=m;
  const u=localStorage.getItem(LS.USER);  if(u) S.userName=u;
  S.soundOn = localStorage.getItem(LS.SND)==='true';
  S.debates = parseInt(localStorage.getItem(LS.DEB)||'0');
  try { const c=localStorage.getItem(LS.CHAT); S.chat=c?JSON.parse(c):[]; } catch { S.chat=[]; }
  if (!localStorage.getItem(LS.FIRST)) localStorage.setItem(LS.FIRST,Date.now());
}

function initApp() {
  loadSettings();
  initSidebar();
  initTopbar();
  initComposer();
  initDebateView();
  initVoice();
  initSettingsModal();
  initModelSelector();
  applyMode(S.mode);
  renderHistory();
  updateGreeting();
  checkBackend();
  setInterval(() => { if(!S.debating) checkBackend(); }, 60000);
  updateSoundIcon();
  document.addEventListener('keydown', handleShortcuts);
}

/* ═══════════════════════════════════════════
   BACKEND
═══════════════════════════════════════════ */
async function checkBackend() {
  setStatusChip('pending','Connecting…');
  try {
    const res = await Promise.race([
      fetch(`${S.backendUrl}/api/health`),
      new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 4000)),
    ]);
    if (res.ok) {
      S.backendOnline=true; S.fallback=false;
      setStatusChip('online','Online');
      setSbDot(true);
      const d = await res.json().catch(()=>({}));
      if (d.keysConfigured) {
        const miss = Object.entries(d.keysConfigured).filter(([,v])=>!v).map(([k])=>k);
        if (miss.length) toast(`API keys missing: ${miss.join(', ')}`, 'warn', 5000);
        updateAgentDots(d.keysConfigured);
      }
      $('fallback-notice')?.classList.add('hidden');
    } else throw new Error(`HTTP ${res.status}`);
  } catch {
    S.backendOnline=false; setFallback(true);
    setStatusChip('offline','Offline');
    setSbDot(false);
  }
}
function setStatusChip(state, label) {
  const dot=$('tsc-dot'), lbl=$('tsc-label');
  if (!dot) return;
  dot.className=`tsc-dot ${state}`; lbl.textContent=label;
}
function setSbDot(online) {
  const d=$('sb-status-dot');
  if(d) d.className=`sb-status-dot ${online?'online':'offline'}`;
}
function setFallback(on) {
  S.fallback=on;
  const n=$('fallback-notice');
  if(n) on?n.classList.remove('hidden'):n.classList.add('hidden');
}
function updateAgentDots(keys) {
  // Future: update agent status in agents view
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
function initSidebar() {
  document.querySelectorAll('.sbm[data-mode]').forEach(b => {
    b.addEventListener('click', () => { applyMode(b.dataset.mode); closeSidebar(); });
  });
  $('new-chat-btn').addEventListener('click', () => { newChat(); closeSidebar(); });
  $('sba-settings').addEventListener('click', openSettings);
  $('sba-lock').addEventListener('click', lockSession);
  $('sba-sound').addEventListener('click', toggleSound);
  $('sb-overlay').addEventListener('click', closeSidebar);

  // Suggestion cards
  document.querySelectorAll('.ess-card[data-prompt]').forEach(c => {
    c.addEventListener('click', () => {
      $('main-textarea').value = c.dataset.prompt;
      sendChat();
    });
  });
}

function openSidebar() {
  $('sidebar').classList.add('open');
  $('sb-overlay').classList.remove('hidden');
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sb-overlay').classList.add('hidden');
}

/* ═══════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════ */
function initTopbar() {
  $('tb-burger').addEventListener('click', () => {
    $('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });
  $('tb-clear').addEventListener('click', clearChat);
  $('tb-share').addEventListener('click', exportChat);
  $('fn-close').addEventListener('click', () => $('fallback-notice').classList.add('hidden'));
}

/* ═══════════════════════════════════════════
   MODE SYSTEM
═══════════════════════════════════════════ */
function applyMode(mode) {
  S.mode = mode;
  const meta = MODE_META[mode] || MODE_META.ask;

  // Update sidebar
  document.querySelectorAll('.sbm').forEach(b => b.classList.toggle('active', b.dataset.mode===mode));

  // Update topbar
  $('tmp-label').textContent = meta.label;
  $('tb-mode-desc').textContent = meta.desc;
  $$('.tmp-dot').style.background = meta.color;

  // Show correct view
  if (mode === 'debate') {
    $('view-chat').classList.remove('active');
    $('view-debate').classList.add('active');
    $('composer-wrap').classList.add('hidden');
    setTimeout(resizeNetCanvas, 50);
  } else {
    $('view-debate').classList.remove('active');
    $('view-chat').classList.add('active');
    $('composer-wrap').classList.remove('hidden');
  }

  // Update placeholder
  const ta = $('main-textarea');
  if (ta) {
    const placeholders = {
      ask:'Message ARIA…',
      code:'Describe your code problem or paste code…',
      strategy:'Describe your strategic challenge…',
      research:'What would you like to research deeply?',
      decision:'What decision are you facing?',
    };
    ta.placeholder = placeholders[mode] || 'Message ARIA…';
  }

  SFX.mode();
}

/* ═══════════════════════════════════════════
   MODEL SELECTOR
═══════════════════════════════════════════ */
function initModelSelector() {
  const curr = $('ms-current');
  const dd   = $('ms-dropdown');
  curr.addEventListener('click', () => {
    const open = !dd.classList.contains('hidden');
    open ? dd.classList.add('hidden') : dd.classList.remove('hidden');
    curr.classList.toggle('open', !open);
  });
  document.querySelectorAll('.msd-item').forEach(item => {
    item.addEventListener('click', () => {
      S.model = item.dataset.m;
      const label = item.dataset.label;
      $('ms-label').textContent = label;
      const colors={openai:'#10b981',claude:'#f59e0b',gemini:'#3b82f6',deepseek:'#a855f7'};
      $('ms-dot').style.background = colors[S.model]||'#10b981';
      document.querySelectorAll('.msd-item').forEach(i => i.classList.toggle('active', i===item));
      dd.classList.add('hidden'); curr.classList.remove('open');
      localStorage.setItem(LS.MOD, S.model);
      toast(`Model: ${label}`, 'success');
    });
  });
  document.addEventListener('click', e => {
    if (!$('model-selector').contains(e.target)) {
      $('ms-dropdown').classList.add('hidden');
      $('ms-current').classList.remove('open');
    }
  });
  // Apply saved model
  const saved = localStorage.getItem(LS.MOD) || 'openai';
  const el = document.querySelector(`.msd-item[data-m="${saved}"]`);
  if (el) el.click();
}

/* ═══════════════════════════════════════════
   CHAT SYSTEM
═══════════════════════════════════════════ */
function initComposer() {
  const ta = $('main-textarea');
  ta.addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  ta.addEventListener('input', () => {
    ta.style.height='auto';
    ta.style.height=Math.min(ta.scrollHeight, 160)+'px';
    $('char-count').textContent=ta.value.length;
  });
  $('main-send-btn').addEventListener('click', sendChat);
  $('voice-btn').addEventListener('click', () => S.voiceActive ? stopVoice() : startVoice());
}

async function sendChat() {
  const ta  = $('main-textarea');
  const raw = ta.value.trim(); if (!raw) return;
  ta.value=''; ta.style.height='auto'; $('char-count').textContent='0';

  // Show feed, hide empty state
  $('empty-state').classList.add('hidden');
  $('chat-feed').classList.remove('hidden');

  addMsg('user', raw);
  SFX.send();

  if (S.backendOnline && !S.fallback) {
    const tid = showTyping();
    $('main-send-btn').disabled=true;
    try {
      const reply = await callAPI(raw, S.model);
      remTyping(tid); $('main-send-btn').disabled=false;
      addMsg('aria', reply, S.model);
      SFX.receive();
    } catch(err) {
      remTyping(tid); $('main-send-btn').disabled=false;
      handleApiErr(err, raw);
    }
    return;
  }
  await sleep(300+Math.random()*300);
  const fb = FB.handle(raw);
  if (fb) { addMsg('aria', fb, null, 'fallback'); SFX.receive(); }
}

async function callAPI(msg, model) {
  const res = await Promise.race([
    fetch(`${S.backendUrl}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,model})}),
    new Promise((_,r) => setTimeout(()=>r(Object.assign(new Error('timeout'),{type:'timeout'})),20000)),
  ]);
  if (res.status===429) throw Object.assign(new Error('Rate limit reached'),{type:'rate_limit'});
  if (res.status===401) throw Object.assign(new Error('Invalid API key'),{type:'auth'});
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const d = await res.json();
  return d.reply || d.message || 'No response received.';
}

function handleApiErr(err, orig) {
  S.backendOnline=false; setFallback(true);
  setStatusChip('offline', err.type==='rate_limit' ? 'Limit' : 'Offline');
  setSbDot(false);
  const msg = err.type==='rate_limit'
    ? `Cloud AI limit reached — switching to local mode.\n\n${FB.handle(orig)}`
    : err.type==='auth'
    ? `API key issue — check your .env file.\n\n${FB.handle(orig)}`
    : `Connection lost — local mode active.\n\n${FB.handle(orig)}`;
  addMsg('aria', msg, null, 'fallback');
  SFX.error();
}

/* ═══════════════════════════════════════════
   RENDERING
═══════════════════════════════════════════ */
const BOLD = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

function addMsg(role, text, model=null, badge=null, save=true) {
  const ts=Date.now();
  if (save) {
    S.chat.push({role,text,model,badge,ts});
    if (S.chat.length>200) S.chat.shift();
    localStorage.setItem(LS.CHAT, JSON.stringify(S.chat));
  }
  renderMsg(role, text, model, badge, ts, true);
  addRecent(text, role);
}

function renderMsg(role, text, model, badge, ts, anim) {
  const feed=$('chat-feed'); if(!feed)return;
  const isAria = role==='aria';
  const div = document.createElement('div');
  div.className=`msg ${role}`;
  if (!anim) div.style.animation='none';

  const mLabels={openai:'GPT-4o',claude:'Claude 3.5',gemini:'Gemini 1.5',deepseek:'DeepSeek'};
  const badgeHtml = isAria && model
    ? `<span class="msg-badge">${mLabels[model]||model}</span>`
    : badge==='fallback'
    ? `<span class="msg-badge local">Local Intel</span>` : '';
  const t = ts ? new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';

  div.innerHTML = `
    <div class="msg-avatar">${isAria?'AI':'YOU'}</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-author">${isAria?'ARIA':S.userName}</span>
        ${badgeHtml}
        <span class="msg-ts">${t}</span>
      </div>
      <div class="msg-content">${BOLD(text)}</div>
      ${isAria ? `<div class="msg-actions">
        <button class="ma-btn" onclick="copyMsg(this)" title="Copy">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10"><rect x="4" y="4" width="8" height="8" rx="1"/><path d="M2 10V2h8"/></svg>Copy
        </button>
      </div>` : ''}
    </div>`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function renderHistory() {
  if (!S.chat.length) return;
  $('empty-state').classList.add('hidden');
  $('chat-feed').classList.remove('hidden');
  S.chat.forEach(m => renderMsg(m.role,m.text,m.model,m.badge,m.ts,false));
  $('chat-feed').scrollTop = $('chat-feed').scrollHeight;
}

function showTyping() {
  const feed=$('chat-feed'); if(!feed)return null;
  const id='ty-'+Date.now();
  const d=document.createElement('div'); d.id=id; d.className='msg aria';
  d.innerHTML=`<div class="msg-avatar">AI</div><div class="msg-body"><div class="msg-header"><span class="msg-author">ARIA</span></div><div class="msg-content"><div class="typing-row"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div></div>`;
  feed.appendChild(d); feed.scrollTop=feed.scrollHeight; return id;
}
function remTyping(id) { if(id) $(id)?.remove(); }

function clearChat() {
  S.chat=[]; localStorage.removeItem(LS.CHAT);
  const f=$('chat-feed'); if(f){f.innerHTML='';f.classList.add('hidden');}
  $('empty-state').classList.remove('hidden');
  toast('Chat cleared','success');
}

function newChat() {
  clearChat();
  applyMode('ask');
}

function copyMsg(btn) {
  const text = btn.closest('.msg-body').querySelector('.msg-content').innerText;
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard','success'));
}

function exportChat() {
  if (!S.chat.length) { toast('No chat to export','warn'); return; }
  const txt = S.chat.map(m=>`${m.role.toUpperCase()} [${new Date(m.ts).toLocaleString()}]\n${m.text}`).join('\n\n---\n\n');
  const a=document.createElement('a'); a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(txt);
  a.download=`aria-chat-${Date.now()}.txt`; a.click();
  toast('Chat exported','success');
}

function addRecent(text, role) {
  if (role!=='user') return;
  const cont=$('sb-recents'); if(!cont)return;
  const empty=cont.querySelector('.sb-recents-empty'); if(empty)empty.remove();
  const el=document.createElement('div'); el.className='recent-item';
  el.textContent=text.slice(0,40)+(text.length>40?'…':'');
  el.title=text; cont.insertBefore(el,cont.firstChild);
  if(cont.children.length>8)cont.removeChild(cont.lastChild);
}

/* ═══════════════════════════════════════════
   NEURAL NETWORK CANVAS
═══════════════════════════════════════════ */
const NET = { c:null, ctx:null, W:0, H:0, particles:[], raf:null };
const NEDGES = [
  ['user','gpt'],['user','claude'],['user','gemini'],['user','deepseek'],
  ['gpt','judge'],['claude','judge'],['gemini','judge'],['deepseek','judge'],
  ['gpt','gemini'],['claude','deepseek'],
];
const NCOLORS = {
  user:'rgba(255,255,255,.7)', gpt:'rgba(16,185,129,.9)',
  claude:'rgba(245,158,11,.9)', gemini:'rgba(59,130,246,.9)',
  deepseek:'rgba(168,85,247,.9)', judge:'rgba(244,63,94,.9)',
};

function getPos() {
  const W=NET.W, H=NET.H;
  return {
    user:     {x:W*.5, y:H*.1},
    claude:   {x:W*.12,y:H*.42},
    gemini:   {x:W*.88,y:H*.42},
    deepseek: {x:W*.2, y:H*.78},
    gpt:      {x:W*.8, y:H*.78},
    judge:    {x:W*.5, y:H*.9},
  };
}

function initNetCanvas() {
  NET.c=$('net-canvas'); if(!NET.c)return;
  NET.ctx=NET.c.getContext('2d');
  resizeNetCanvas();
  window.addEventListener('resize',resizeNetCanvas);
  for(let i=0;i<15;i++) NET.particles.push(newNP());
  renderNetLoop();
}

function newNP() {
  return{x:Math.random()*(NET.W||500),y:Math.random()*(NET.H||400),vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:.5+Math.random()*.5};
}

function resizeNetCanvas() {
  const pane=$('debate-network-pane'); if(!pane||!NET.c)return;
  NET.W=NET.c.width=pane.offsetWidth;
  NET.H=NET.c.height=pane.offsetHeight;
  posNodes();
}

function posNodes() {
  if(!NET.W||!NET.H)return;
  const pos=getPos();
  const m={user:'nnn-user',gpt:'nnn-gpt',claude:'nnn-claude',gemini:'nnn-gemini',deepseek:'nnn-deepseek',judge:'nnn-judge'};
  Object.entries(m).forEach(([k,id])=>{
    const el=$(id); if(el&&pos[k]){el.style.left=pos[k].x+'px';el.style.top=pos[k].y+'px';}
  });
}

// Edge particles travelling along lines
const EP=[];
function spawnEP(from,to,color,s=.007) {
  const pos=getPos(),a=pos[from],b=pos[to]; if(!a||!b)return;
  EP.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,t:0,speed:s+(Math.random()*.005),color,trail:[]});
}

function renderNetLoop() {
  NET.raf=requestAnimationFrame(renderNetLoop);
  const ctx=NET.ctx; if(!ctx||!NET.W)return;
  ctx.clearRect(0,0,NET.W,NET.H);

  const pos=getPos();

  // Ambient glow
  const g=ctx.createRadialGradient(NET.W/2,NET.H/2,0,NET.W/2,NET.H/2,NET.W*.5);
  g.addColorStop(0,'rgba(99,102,241,0.04)'); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; ctx.fillRect(0,0,NET.W,NET.H);

  // Edges
  NEDGES.forEach(([a,b])=>{
    const pa=pos[a],pb=pos[b]; if(!pa||!pb)return;
    const active=S.debating;
    const gr=ctx.createLinearGradient(pa.x,pa.y,pb.x,pb.y);
    const al=active?.16:.06;
    gr.addColorStop(0,`rgba(99,102,241,${al})`);
    gr.addColorStop(.5,`rgba(139,92,246,${al*1.5})`);
    gr.addColorStop(1,`rgba(99,102,241,${al})`);
    ctx.beginPath(); ctx.strokeStyle=gr; ctx.lineWidth=active?1:.5;
    ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
  });

  // Edge particles
  for(let i=EP.length-1;i>=0;i--){
    const p=EP[i]; p.t+=p.speed;
    if(p.t>=1){EP.splice(i,1);continue;}
    const x=p.ax+(p.bx-p.ax)*p.t;
    const y=p.ay+(p.by-p.ay)*p.t;
    p.trail.push({x,y});
    if(p.trail.length>10)p.trail.shift();
    // Trail
    p.trail.forEach((pt,ti)=>{
      const a=(ti/p.trail.length)*.7;
      const r=1.5*(ti/p.trail.length)+.5;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
      ctx.fillStyle=p.color.replace(/[\d.]+\)$/,`${a})`); ctx.fill();
    });
    // Glow
    const gr=ctx.createRadialGradient(x,y,0,x,y,12);
    gr.addColorStop(0,p.color.replace(/[\d.]+\)$/,'0.4)'));
    gr.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(x,y,12,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
    ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill();
  }

  // Spawn particles when debating
  if(S.debating && Math.random()<.04){
    const e=NEDGES[Math.floor(Math.random()*NEDGES.length)];
    const cols=Object.values(NCOLORS);
    spawnEP(e[0],e[1],cols[Math.floor(Math.random()*cols.length)]);
  }

  // Background dots
  NET.particles.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=NET.W; if(p.x>NET.W)p.x=0;
    if(p.y<0)p.y=NET.H; if(p.y>NET.H)p.y=0;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fill();
  });
}

function setNN(id,state) {
  const el=$('nnn-'+id);
  if(el){ el.classList.remove('thinking','done'); if(state!=='idle')el.classList.add(state); el.className+=' '+id+'-nnn'; }
}
function setNNState(id,state) {
  const el=$('nnn-'+id);
  if(!el)return;
  el.classList.remove('thinking','done');
  if(state!=='idle')el.classList.add(state);
}

function setTicker(text,state='idle') {
  const dot=$$('.nt-dot'), txt=$('nt-text');
  if(dot)dot.className=`nt-dot ${state}`;
  if(txt)txt.textContent=text;
}

/* ═══════════════════════════════════════════
   DEBATE VIEW
═══════════════════════════════════════════ */
function initDebateView() {
  const tog=$('debate-tog'), st=$('dap-tog-status');
  tog?.addEventListener('change',()=>{
    S.debateOn=tog.checked;
    st.textContent=tog.checked?'ON':'OFF';
    st.className=`dap-tog-status ${tog.checked?'on':''}`;
    toast(tog.checked?'Debate mode on':'Debate mode off','success');
  });

  const ta=$('debate-textarea');
  ta?.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendDebate();}
  });
  ta?.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px';});
  $('debate-send-btn')?.addEventListener('click',sendDebate);
}

async function sendDebate() {
  if(S.debating) return;
  const ta=$('debate-textarea');
  const q=ta?.value.trim(); if(!q)return;
  ta.value=''; ta.style.height='auto';

  S.debating=true;
  $('debate-send-btn').disabled=true;

  // UI setup
  const cards=$('agent-cards');
  cards.innerHTML='';
  const ql=document.createElement('div'); ql.className='debate-q-label';
  ql.textContent=q.length>60?q.slice(0,60)+'…':q;
  cards.appendChild(ql);

  $('dnp-status').textContent='ACTIVE'; $('dnp-status').className='dnp-status active';
  $('agent-empty')?.remove();
  ['gpt','claude','gemini','deepseek','judge'].forEach(n=>setNNState(n,'idle'));
  setNNState('user','thinking');
  setTicker('Distributing query to agents…','active');
  spawnEP('user','gpt',NCOLORS.gpt); spawnEP('user','claude',NCOLORS.claude);
  spawnEP('user','gemini',NCOLORS.gemini); spawnEP('user','deepseek',NCOLORS.deepseek);
  await sleep(400); setNNState('user','done');
  ['gpt','claude','gemini','deepseek'].forEach(n=>setNNState(n,'thinking'));
  setTicker('All agents analyzing simultaneously…','active');

  if(!S.backendOnline||S.fallback) {
    await runLocalDebate(q,cards);
  } else {
    let result=null;
    try {
      const res=await Promise.race([
        fetch(`${S.backendUrl}/api/debate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})}),
        new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),28000)),
      ]);
      if(res.status===429){setFallback(true);throw Object.assign(new Error('limit'),{type:'rate_limit'});}
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      result=await res.json();
    } catch(err) {
      ['gpt','claude','gemini','deepseek','judge'].forEach(n=>setNNState(n,'idle'));
      await runLocalDebate(q,cards);
      S.debating=false; $('debate-send-btn').disabled=false;
      return;
    }

    // Stream agents
    const agentCfg=[
      {key:'claude',   id:'claude',   color:'#f59e0b', label:'CLAUDE',   tag:'Anthropic'},
      {key:'gemini',   id:'gemini',   color:'#3b82f6', label:'GEMINI',   tag:'Google'},
      {key:'deepseek', id:'deepseek', color:'#a855f7', label:'DEEPSEEK', tag:'DeepSeek AI'},
      {key:'openai',   id:'gpt',      color:'#10b981', label:'GPT-4o',   tag:'OpenAI'},
    ];
    for(const ag of agentCfg) {
      const text=result[ag.key]; if(!text)continue;
      setNNState(ag.id,'done');
      setTicker(`${ag.label} responded — forwarding to Judge…`,'active');
      spawnEP(ag.id,'judge',NCOLORS[ag.id]);
      const card=makeAgCard(ag.label,ag.tag,ag.color);
      cards.appendChild(card.el); await streamEl(card.body,text); await sleep(100);
    }
    // Judge
    setNNState('judge','thinking');
    setTicker('Final Judge synthesizing verdict…','active');
    ['claude','gemini','deepseek','gpt'].forEach((n,i)=>setTimeout(()=>spawnEP(n,'judge',NCOLORS.judge,.009),i*120));
    await sleep(800);
    if(result.openai_judgment){
      setNNState('judge','done');
      setTicker('Verdict delivered.','done');
      $('dnp-status').textContent='COMPLETE'; $('dnp-status').className='dnp-status complete';
      const jc=makeJudgeCard();
      cards.appendChild(jc.el); await streamEl(jc.body,result.openai_judgment);
      SFX.judgment();
    }
  }

  S.debates++; localStorage.setItem(LS.DEB,S.debates);
  S.debating=false; $('debate-send-btn').disabled=false;
  cards.scrollTop=cards.scrollHeight;
}

async function runLocalDebate(q,cards) {
  const agents=[
    {label:'STRATEGIC ANALYSIS',tag:'Local Intel',color:'#f59e0b',
      text:`Strategic view on "${q}":\n\nThe key leverage point is identifying which single variable produces the highest compounding return. Map all paths — which are reversible vs. irreversible? The bold move: commit resources only after a minimum viable test proves the core assumption. Asymmetric bets — low downside, high upside — should always be explored first.`},
    {label:'ADVERSARIAL CRITIQUE',tag:'Local Intel',color:'#3b82f6',
      text:`Critical challenge on "${q}":\n\nThe hidden assumption most likely to break this thesis: that the market timing is correct, or that the core capability assumption holds. Most strategic failures come not from poor execution but from an unquestioned foundational belief that turned out to be wrong. What's the one question you're most afraid to pressure-test?`},
    {label:'REALIST ASSESSMENT',tag:'Local Intel',color:'#a855f7',
      text:`Ground reality on "${q}":\n\nExecution is where ideas die. What does this actually require — timeline, capital, and capability? The execution discount rule: plans take 2–3× longer and cost 2–3× more than projected. Where do 80% of attempts at this specific challenge fail? That's where to focus first.`},
  ];
  for(const ag of agents){
    setNNState('gpt','done'); setNNState('claude','done');
    setNNState('gemini','done'); setNNState('deepseek','done');
    const card=makeAgCard(ag.label,ag.tag,ag.color);
    cards.appendChild(card.el); await streamEl(card.body,ag.text); await sleep(200);
  }
  setNNState('judge','thinking');
  setTicker('Final Judge synthesizing…','active');
  await sleep(700);
  setNNState('judge','done');
  setTicker('Verdict delivered.','done');
  $('dnp-status').textContent='COMPLETE'; $('dnp-status').className='dnp-status complete';

  const math=FB.math(q);
  const verdict=math
    ?`Calculation: ${math}\n\nFor full multi-model debate with real AI agents, connect your backend with valid API keys.`
    :`Synthesis on "${q}":\n\nThe Strategic view correctly identifies leverage and optionality as the core variables. The Adversarial critique reveals the most dangerous hidden assumption worth stress-testing first. The Realist view grounds this in execution reality.\n\nFinal verdict: Begin with the smallest possible experiment that directly tests the core assumption. Execute fast, measure signal, then commit or pivot. This is the move that survives all three critiques simultaneously.\n\n⚠ Local intelligence mode — connect API keys for full multi-model debate.`;
  const jc=makeJudgeCard();
  cards.appendChild(jc.el); await streamEl(jc.body,verdict);
  SFX.judgment();
}

function makeAgCard(label,tag,color) {
  const el=document.createElement('div'); el.className='a-card';
  const body=document.createElement('div'); body.className='a-card-body';
  el.innerHTML=`<div class="a-card-header"><div class="a-card-bar" style="background:${color}"></div><div class="a-card-name" style="color:${color}">${label}</div><div class="a-card-tag">${tag}</div></div>`;
  el.appendChild(body); return{el,body};
}
function makeJudgeCard() {
  const el=document.createElement('div'); el.className='judge-card';
  const body=document.createElement('div'); body.className='jc-body';
  el.innerHTML=`<div class="jc-header"><div class="jc-title">⚖ Final Judgment</div><div class="jc-verdict">VERDICT</div></div>`;
  el.appendChild(body); return{el,body};
}

async function streamEl(el,text,speed=11) {
  el.textContent=''; el.classList.add('streaming');
  for(let i=0;i<text.length;i++){
    el.textContent+=text[i];
    if(i%6===0) { $('agent-cards')?.scrollTo({top:9999,behavior:'smooth'}); await sleep(speed+Math.random()*4); }
  }
  el.classList.remove('streaming');
}

/* ═══════════════════════════════════════════
   VOICE
═══════════════════════════════════════════ */
function initVoice() {
  // Already wired in initComposer
}
function startVoice() {
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Voice requires Chrome or Edge','error');return;}
  if(!S.recognition){
    S.recognition=new SR();
    S.recognition.continuous=false; S.recognition.interimResults=false; S.recognition.lang='en-US';
    S.recognition.onresult=e=>{
      const t=e.results[0][0].transcript.trim();
      $('main-textarea').value=t;
      stopVoice(); sendChat();
    };
    S.recognition.onerror=()=>stopVoice();
    S.recognition.onend=()=>{if(S.voiceActive)try{S.recognition.start();}catch{}};
  }
  S.voiceActive=true;
  $('voice-btn').classList.add('active');
  try{S.recognition.start();}catch{}
  toast('Listening…','success');
}
function stopVoice() {
  S.voiceActive=false; $('voice-btn')?.classList.remove('active');
  if(S.recognition)try{S.recognition.stop();}catch{}
}

/* ═══════════════════════════════════════════
   SOUND
═══════════════════════════════════════════ */
function toggleSound() {
  if(!audioCtx)initAudio();
  S.soundOn=!S.soundOn;
  localStorage.setItem(LS.SND,S.soundOn?'true':'false');
  updateSoundIcon();
  toast(S.soundOn?'Sound on':'Sound off','success');
  if(S.soundOn)SFX.receive();
}
function updateSoundIcon() {
  const icon=$('sound-icon'); if(!icon)return;
  if(S.soundOn) {
    icon.innerHTML='<polygon points="3,5 7,5 11,2 11,14 7,11 3,11"/><path d="M13 5.5a4 4 0 010 5"/>';
  } else {
    icon.innerHTML='<polygon points="3,5 7,5 11,2 11,14 7,11 3,11"/><line x1="14" y1="5" x2="8" y2="11"/><line x1="8" y1="5" x2="14" y2="11"/>';
  }
}

/* ═══════════════════════════════════════════
   SETTINGS MODAL
═══════════════════════════════════════════ */
function initSettingsModal() {
  $('sba-settings').addEventListener('click', openSettings);
  $('modal-close').addEventListener('click', closeSettings);
  $('modal-cancel').addEventListener('click', closeSettings);
  $('modal-save').addEventListener('click', saveSettings);
  $('modal-scrim').addEventListener('click', e => { if(e.target===$('modal-scrim'))closeSettings(); });
}
function openSettings() {
  $('set-backend').value=S.backendUrl;
  $('set-defmodel').value=S.model;
  $('set-name').value=S.userName;
  $('set-stay').checked=localStorage.getItem(LS.STAY)!=='false';
  $('modal-scrim').classList.remove('hidden');
}
function closeSettings() { $('modal-scrim').classList.add('hidden'); }
function saveSettings() {
  S.backendUrl=$('set-backend').value.trim().replace(/\/$/,'')||CFG.BACKEND;
  S.model=$('set-defmodel').value;
  S.userName=$('set-name').value.trim()||CFG.USER;
  const stay=$('set-stay').checked;
  const pin=$('set-pin').value.trim();
  if(pin&&/^\d{4}$/.test(pin)){localStorage.setItem('a6_pin',pin);toast('PIN updated','success');}
  localStorage.setItem(LS.BACK,S.backendUrl);
  localStorage.setItem(LS.MOD,S.model);
  localStorage.setItem(LS.USER,S.userName);
  localStorage.setItem(LS.STAY,stay?'true':'false');
  const ms=document.querySelector(`.msd-item[data-m="${S.model}"]`);
  if(ms)ms.click();
  closeSettings(); toast('Settings saved','success');
  checkBackend();
}

/* ═══════════════════════════════════════════
   LOCK
═══════════════════════════════════════════ */
function lockSession() {
  S.authed=false; localStorage.removeItem(LS.AUTH);
  S.pin=''; updPin(); $('auth-err')?.classList.add('hidden');
  $('app').classList.add('hidden');
  $('auth-screen').classList.remove('hidden');
  $('auth-screen').classList.add('active');
  toast('Session locked','success');
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function updateGreeting() {
  const h=new Date().getHours();
  const g=h<12?'morning':h<18?'afternoon':'evening';
  $('es-time-greeting').textContent=g;
}

function handleShortcuts(e) {
  // ⌘K / Ctrl+K to focus input
  if ((e.metaKey||e.ctrlKey) && e.key==='k') {
    e.preventDefault();
    $('main-textarea')?.focus();
  }
  if ((e.metaKey||e.ctrlKey) && e.key==='l') {
    e.preventDefault(); clearChat();
  }
}

function toast(msg,type='success',dur=3000) {
  const c=$('toasts'); if(!c)return;
  const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg;
  c.appendChild(el);
  setTimeout(()=>{el.style.animation='toastOut .3s ease forwards';setTimeout(()=>el.remove(),300);},dur);
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initBgCanvas();
  initPin();
  initAudio();

  // Check saved auth
  loadSettings();
  const stay=localStorage.getItem(LS.STAY)!=='false';
  if(localStorage.getItem(LS.AUTH)==='true' && stay){
    S.authed=true;
    $('auth-screen').classList.remove('active');
    $('auth-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
    initApp();
    initNetCanvas();
  } else {
    // Still need netCanvas later
  }

  // Session tracking
  const sc=parseInt(localStorage.getItem('a6_sessions')||'0')+1;
  localStorage.setItem('a6_sessions',sc);
});

// Init net canvas when debate view is first activated
const origApplyMode=applyMode;

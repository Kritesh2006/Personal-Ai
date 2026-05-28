/*
  ARIA SYSTEM v5 — script.js
  © Kritesh Dhungel 2025 · All Rights Reserved
  Unauthorized copying or redistribution prohibited.
*/
'use strict';

/* ════════════════════════════════════════
   CONFIG
════════════════════════════════════════ */
const CFG = {
  PIN:     '0002',
  BACKEND: 'http://localhost:3000',
  USER:    'Mr. Kritesh',
};

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
const S = {
  pin:'', authenticated:false,
  backendUrl:CFG.BACKEND, backendOnline:false,
  model:'openai', debateOn:true,
  chat:[], debates:0,
  userName:CFG.USER,
  debating:false, fallback:false,
  voiceActive:false, recognition:null,
};

const LS = {
  AUTH:'av5_auth', CHAT:'av5_chat', BACK:'av5_back',
  MOD:'av5_mod',   USER:'av5_usr',  STAY:'av5_stay',
  DCOUNT:'av5_dc', FIRST:'av5_first',
};

const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelector(sel);

/* ════════════════════════════════════════
   FALLBACK ENGINE
════════════════════════════════════════ */
const FB = {
  math(t) {
    const lo = t.toLowerCase().trim();
    // Percentage of
    const p1 = lo.match(/(\d+\.?\d*)\s*%\s*of\s*(\d+\.?\d*)/i);
    if (p1) return `${p1[1]}% of ${p1[2]} = **${((+p1[1]/100)*+p1[2]).toFixed(4).replace(/\.?0+$/,'')}**`;
    // Conversions
    const km2mi = lo.match(/^(\d+\.?\d*)\s*km\s+to\s+m/i);
    if (km2mi) return `${km2mi[1]} km = **${(+km2mi[1]*0.6214).toFixed(3)} miles**`;
    const mi2km = lo.match(/^(\d+\.?\d*)\s*mi\w*\s+to\s+km/i);
    if (mi2km) return `${mi2km[1]} miles = **${(+mi2km[1]*1.6093).toFixed(3)} km**`;
    const c2f = lo.match(/^(-?\d+\.?\d*)\s*°?c\s+to\s+f/i);
    if (c2f) return `${c2f[1]}°C = **${((+c2f[1]*9/5)+32).toFixed(1)}°F**`;
    const f2c = lo.match(/^(-?\d+\.?\d*)\s*°?f\s+to\s+c/i);
    if (f2c) return `${f2c[1]}°F = **${(((+f2c[1])-32)*5/9).toFixed(1)}°C**`;
    const kg2lb = lo.match(/^(\d+\.?\d*)\s*kg\s+to\s+lb/i);
    if (kg2lb) return `${kg2lb[1]} kg = **${(+kg2lb[1]*2.2046).toFixed(3)} lbs**`;
    // Pure math
    const expr = t.replace(/[^0-9+\-*/().\s%]/g,'').trim();
    if (/^[\d\s+\-*/().%]+$/.test(expr) && expr.length>1) {
      try {
        const r = Function('"use strict";return('+expr+')')();
        if (typeof r==='number' && isFinite(r))
          return `${expr.trim()} = **${r%1===0?r:+r.toFixed(6)}**`;
      } catch {}
    }
    return null;
  },

  cmd(t) {
    const lo = t.toLowerCase().trim();
    const sites = {youtube:'https://youtube.com',google:'https://google.com',gmail:'https://mail.google.com',
      github:'https://github.com',reddit:'https://reddit.com',spotify:'https://open.spotify.com',
      netflix:'https://netflix.com',twitter:'https://x.com',x:'https://x.com',
      instagram:'https://instagram.com',amazon:'https://amazon.com',chatgpt:'https://chat.openai.com'};
    for (const [name,url] of Object.entries(sites)) {
      if (new RegExp(`(open|launch|go to)\\s+${name}`,'i').test(lo)) {
        window.open(url,'_blank');
        return `Opening **${name[0].toUpperCase()+name.slice(1)}**…`;
      }
    }
    const yt = lo.match(/(?:search youtube|youtube search)\s+(?:for\s+)?(.+)/);
    if (yt) { window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(yt[1])}`,'_blank'); return `Searching YouTube for **"${yt[1]}"**`; }
    const g  = lo.match(/(?:search google|google search|search for|search)\s+(.+)/);
    if (g)  { window.open(`https://www.google.com/search?q=${encodeURIComponent(g[1])}`,'_blank');  return `Searching Google for **"${g[1]}"**`; }
    if (/what(?:'?s| is)?.*time|time right now|current time/i.test(lo))
      return `Current time: **${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}**`;
    if (/today'?s? date|what day is|current date/i.test(lo))
      return `Today: **${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}**`;
    if (/^(clear chat|reset chat|clear)$/i.test(lo)) { clearChat(); return null; }
    if (/start voice|voice mode/i.test(lo)) { startVoice(); return 'Voice mode activated.'; }
    if (/stop voice|voice off/i.test(lo))   { stopVoice();  return 'Voice mode off.'; }
    return null;
  },

  general(t) {
    const lo = t.toLowerCase();
    const h  = new Date().getHours();
    const p  = h<12?'morning':h<18?'afternoon':'evening';
    if (/^(hi|hey|hello|yo|sup|howdy)\b/i.test(lo))
      return `Good ${p}, ${S.userName}. ARIA is running in local intelligence mode — cloud AI unavailable right now. I can handle math, conversions, commands, and basic analysis.`;
    if (/how are you|how'?re you/i.test(lo))
      return `Systems nominal. Running local fallback — full AI intelligence resumes when backend reconnects. What do you need?`;
    if (/what can you do|help me|capabilities/i.test(lo))
      return `**Local fallback active.** I can:\n• Math: 1+1, 50% of 200, 100*3.14\n• Conversions: km to miles, °C to °F, kg to lbs\n• Open sites: "open YouTube", "open GitHub"\n• Search: "search Google for X"\n• Time & date: "what time is it"\n• Basic Q&A and strategic frameworks\n\nConnect backend + API keys for full multi-model AI intelligence.`;
    if (/1\s*\+\s*1|one plus one/i.test(lo)) return '1 + 1 = **2**';
    return `I'm in local intelligence mode — cloud AI currently unavailable.\n\nTry: "open YouTube", "what time is it", "100 * 3.14", "20% of 500"\n\nOr ask a strategic question and I'll apply local reasoning frameworks.`;
  },

  handle(t) {
    const cmd = this.cmd(t);   if (cmd !== null) return cmd;
    const m   = this.math(t);  if (m   !== null) return `📐 ${m}`;
    return this.general(t);
  },
};

/* ════════════════════════════════════════
   GLOBAL ATMOSPHERE CANVAS
════════════════════════════════════════ */
function initAtmoCanvas() {
  const c   = $('atmo-particles');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width  = window.innerWidth;
  c.height = window.innerHeight;
  window.addEventListener('resize', () => { c.width=window.innerWidth; c.height=window.innerHeight; });

  const PTS = Array.from({length:60},() => ({
    x: Math.random()*c.width, y: Math.random()*c.height,
    vx:(Math.random()-.5)*.3,  vy:(Math.random()-.5)*.3,
    r: Math.random()*.8+.2, a: Math.random()*.12+.03,
  }));

  function draw() {
    c.width = window.innerWidth; c.height = window.innerHeight;
    ctx.clearRect(0,0,c.width,c.height);
    PTS.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0;
      if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,31,53,${p.a*0.6})`;ctx.fill();
      PTS.forEach(q => {
        const d=Math.hypot(p.x-q.x,p.y-q.y);
        if(d<90){
          ctx.beginPath();ctx.strokeStyle=`rgba(255,31,53,${.04*(1-d/90)})`;
          ctx.lineWidth=.4;ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════════
   BOOT
════════════════════════════════════════ */
const BOOT_MSGS = [
  'INITIALIZING ARIA CORE INTELLIGENCE',
  'LOADING MULTI-MODEL DEBATE ENGINE',
  'CALIBRATING AI AGENT NETWORK',
  'ACTIVATING LOCAL FALLBACK LAYER',
  'ARIA SYSTEM v5 — OPERATIONAL',
];

function initBootCanvas() {
  const c = $('boot-canvas');
  if (!c) return;
  c.width=window.innerWidth; c.height=window.innerHeight;
  const ctx=c.getContext('2d');
  const pts=Array.from({length:50},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:Math.random()*1.5+.3,a:Math.random()*.3+.1}));
  function draw(){
    if(!$('s-boot').classList.contains('active'))return;
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;
      if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,31,53,${p.a*.5})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

async function runBoot() {
  initAtmoCanvas();
  initBootCanvas();
  const bar  = $('bpr-fill');
  const pct  = $('bpr-pct');
  const log  = $('boot-log');
  const CIRC = 2*Math.PI*52;

  for (let i=0;i<BOOT_MSGS.length;i++) {
    await sleep(i===0?300:380+Math.random()*220);
    const prog=(i+1)/BOOT_MSGS.length;
    if(bar) bar.style.strokeDashoffset=CIRC*(1-prog);
    if(pct) pct.textContent=Math.round(prog*100);
    if(log){
      const el=document.createElement('div');
      el.className='bll';el.textContent='▸ '+BOOT_MSGS[i];log.appendChild(el);
      [...log.children].forEach((e,j)=>e.className='bll '+(j===log.children.length-1?'act':'done'));
    }
  }
  await sleep(700);
  loadSettings();
  const stayIn=localStorage.getItem(LS.STAY)!=='false';
  if(localStorage.getItem(LS.AUTH)==='true'&&stayIn){
    S.authenticated=true; trans('s-boot','s-conn'); runConn();
  } else {
    trans('s-boot','s-pin'); initPinCanvas();
  }
}

/* ════════════════════════════════════════
   PIN CANVAS
════════════════════════════════════════ */
function initPinCanvas(){
  const c=$('pin-canvas');if(!c)return;
  c.width=window.innerWidth;c.height=window.innerHeight;
  const ctx=c.getContext('2d');
  const pts=Array.from({length:35},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3}));
  function draw(){
    if(!$('s-pin').classList.contains('active'))return;
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;
      if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0;
      pts.forEach(q=>{
        const d=Math.hypot(p.x-q.x,p.y-q.y);
        if(d<110){ctx.beginPath();ctx.strokeStyle=`rgba(255,31,53,${.07*(1-d/110)})`;ctx.lineWidth=.5;ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════════
   PIN PAD
════════════════════════════════════════ */
function initPin(){
  document.querySelectorAll('.pk[data-v]').forEach(b=>b.addEventListener('click',()=>pinDigit(b.dataset.v)));
  $('pk-del').addEventListener('click',()=>{S.pin=S.pin.slice(0,-1);updDots();});
  $('pk-ok').addEventListener('click',pinCheck);
  document.addEventListener('keydown',e=>{
    if(!$('s-pin').classList.contains('active'))return;
    if(/^[0-9]$/.test(e.key))pinDigit(e.key);
    if(e.key==='Backspace'){S.pin=S.pin.slice(0,-1);updDots();}
    if(e.key==='Enter')pinCheck();
  });
}

function pinDigit(d){
  if(S.pin.length>=4)return;
  S.pin+=d;updDots();
  if(S.pin.length===4)setTimeout(pinCheck,200);
}
function updDots(){
  for(let i=0;i<4;i++){
    const e=$(`ps${i}`);
    if(e)e.className='pseg'+(i<S.pin.length?' filled':'');
  }
}
function pinCheck(){
  const correct=localStorage.getItem('av5_pin')||CFG.PIN;
  if(S.pin===correct){
    S.authenticated=true;S.pin='';
    if(localStorage.getItem(LS.STAY)!=='false')localStorage.setItem(LS.AUTH,'true');
    setTimeout(()=>{trans('s-pin','s-conn');runConn();},300);
  } else {
    for(let i=0;i<4;i++){const e=$(`ps${i}`);if(e)e.className='pseg err';}
    $('pin-err').classList.remove('hidden');S.pin='';
    setTimeout(()=>{updDots();$('pin-err').classList.add('hidden');},1500);
  }
}

/* ════════════════════════════════════════
   CONNECT
════════════════════════════════════════ */
function initConnCanvas(){
  const c=$('conn-canvas');if(!c)return;
  c.width=window.innerWidth;c.height=window.innerHeight;
  const ctx=c.getContext('2d');let r=0;
  function draw(){
    if(!$('s-conn').classList.contains('active'))return;
    ctx.clearRect(0,0,c.width,c.height);
    const cx=c.width/2,cy=c.height/2;
    [0,1,2].forEach(i=>{
      const rad=(r+i*100)%(Math.min(c.width,c.height)*.6);
      ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,31,53,${.12*(1-rad/(Math.min(c.width,c.height)*.6))})`;
      ctx.lineWidth=1;ctx.stroke();
    });
    r=(r+0.6)%(Math.min(c.width,c.height)*.6);
    requestAnimationFrame(draw);
  }
  draw();
}

async function runConn(){
  initConnCanvas();
  const steps=[$('cst0'),$('cst1'),$('cst2'),$('cst3')];
  for(let i=0;i<steps.length;i++){
    await sleep(380+i*400);
    if(i>0)steps[i-1].className='cst done';
    steps[i].className='cst active';
    if(i===1)await checkBackend();
  }
  await sleep(350);steps[steps.length-1].className='cst done';
  await sleep(700);
  trans('s-conn','s-app');
  onAppReady();
}

async function checkBackend(){
  setStatus('pending','CONNECTING');
  try{
    const res=await Promise.race([
      fetch(`${S.backendUrl}/api/health`),
      new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),4000)),
    ]);
    if(res.ok){
      S.backendOnline=true;S.fallback=false;setStatus('online','ONLINE');
      const d=await res.json().catch(()=>({}));
      if(d.keysConfigured){
        const miss=Object.entries(d.keysConfigured).filter(([,v])=>!v).map(([k])=>k);
        if(miss.length)toast(`API keys missing: ${miss.join(', ')}. Add to .env`,'warning',5000);
        updateAgentBadges(d.keysConfigured);
      }
    }else throw new Error(`HTTP ${res.status}`);
  }catch{
    S.backendOnline=false;setStatus('offline','OFFLINE');setFallback(true);
  }
}

function setStatus(state,label){
  const dot=$('tns-dot'),lbl=$('tns-label');
  if(!dot)return;
  dot.className=`tns-dot ${state}`;lbl.className=`${state}`;lbl.textContent=label;
}

function setFallback(on){
  S.fallback=on;
  const bar=$('fallback-bar');
  if(bar)on?bar.classList.remove('hidden'):bar.classList.add('hidden');
}

function updateAgentBadges(keys){
  const m={openai:'ags-gpt',anthropic:'ags-claude',gemini:'ags-gemini',deepseek:'ags-deepseek'};
  Object.entries(m).forEach(([k,id])=>{
    const el=$(id);if(!el)return;
    if(keys[k]){el.textContent='CONNECTED';el.className='agc-status-badge ok';}
    else{el.textContent='KEY MISSING';el.className='agc-status-badge fail';}
  });
}

function trans(from,to){$(from)?.classList.remove('active');$(to)?.classList.add('active');}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const boldify=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');

/* ════════════════════════════════════════
   APP READY
════════════════════════════════════════ */
function loadSettings(){
  const b=localStorage.getItem(LS.BACK);if(b)S.backendUrl=b;
  const m=localStorage.getItem(LS.MOD);if(m)S.model=m;
  const u=localStorage.getItem(LS.USER);if(u)S.userName=u;
  S.debates=parseInt(localStorage.getItem(LS.DCOUNT)||'0');
  try{const c=localStorage.getItem(LS.CHAT);S.chat=c?JSON.parse(c):[];}catch{S.chat=[];}
  if(!localStorage.getItem(LS.FIRST))localStorage.setItem(LS.FIRST,Date.now());
}

function onAppReady(){
  initSidebar();
  initTopNav();
  initModelDropdown();
  initChatView();
  initDebateView();
  initVoiceView();
  initMarketsChips();
  initSettings();
  initNeuralCanvas();
  initWelcomeCanvas();
  renderChatHistory();
  updateMemStats();
  setInterval(()=>{if(!S.debating)checkBackend();},60000);
}

/* ════════════════════════════════════════
   SIDEBAR & NAV
════════════════════════════════════════ */
function initSidebar(){
  document.querySelectorAll('.sbn[data-view],.mnb[data-view]').forEach(b=>{
    b.addEventListener('click',()=>{
      switchView(b.dataset.view);
      if(window.innerWidth<=768)$('sidebar')?.classList.remove('open');
    });
  });
  $('sb-settings')?.addEventListener('click',openModal);
  $('sb-lock')?.addEventListener('click',lockSession);
  $('tn-burger')?.addEventListener('click',()=>$('sidebar')?.classList.toggle('open'));
  $('mnb-settings')?.addEventListener('click',openModal);
  $('fb-close')?.addEventListener('click',()=>$('fallback-bar')?.classList.add('hidden'));
}

function switchView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.sbn[data-view],.mnb[data-view]').forEach(b=>b.classList.remove('active'));
  $(`view-${id}`)?.classList.add('active');
  document.querySelectorAll(`[data-view="${id}"]`).forEach(b=>b.classList.add('active'));
  const bc=$('tn-breadcrumb');if(bc)bc.textContent=id.toUpperCase();
  if(id==='debate')setTimeout(resizeNeuralCanvas,50);
}

/* ════════════════════════════════════════
   TOP NAV
════════════════════════════════════════ */
function initTopNav(){
  $('tn-clear')?.addEventListener('click',clearChat);
}

/* ════════════════════════════════════════
   MODEL DROPDOWN
════════════════════════════════════════ */
function initModelDropdown(){
  const chip=$('tn-model-chip'),dd=$('model-dropdown');
  if(!chip||!dd)return;
  chip.addEventListener('click',e=>{e.stopPropagation();dd.classList.toggle('open');});
  document.querySelectorAll('.md-item').forEach(item=>{
    item.addEventListener('click',()=>{
      S.model=item.dataset.model;
      const label=item.dataset.label;
      $('tmc-label').textContent=label;
      const colors={openai:'#10d07a',claude:'#f5a623',gemini:'#4d9fff',deepseek:'#b060ff'};
      $('tmc-orb').style.background=colors[S.model]||'#10d07a';
      $('tmc-orb').style.boxShadow=`0 0 8px ${colors[S.model]||'#10d07a'}99`;
      document.querySelectorAll('.md-item').forEach(i=>i.classList.toggle('active',i===item));
      localStorage.setItem(LS.MOD,S.model);
      dd.classList.remove('open');
      toast(`Model: ${label}`,'info');
    });
  });
  document.addEventListener('click',e=>{if(!chip.contains(e.target))dd.classList.remove('open');});
  // Apply saved model on load
  const saved=localStorage.getItem(LS.MOD)||'openai';
  const item=document.querySelector(`.md-item[data-model="${saved}"]`);
  if(item)item.click();
}

/* ════════════════════════════════════════
   WELCOME CANVAS
════════════════════════════════════════ */
function initWelcomeCanvas(){
  const c=$('wlc-canvas');if(!c)return;
  const ctx=c.getContext('2d');
  function resize(){c.width=c.offsetWidth;c.height=c.offsetHeight;}
  resize();window.addEventListener('resize',resize);
  const pts=Array.from({length:50},()=>({
    x:Math.random()*(c.width||800),y:Math.random()*(c.height||600),
    vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,
    r:Math.random()*1.5+.4,
  }));
  function draw(){
    if(!$('view-chat')?.classList.contains('active')){requestAnimationFrame(draw);return;}
    if(c.offsetWidth!==c.width||c.offsetHeight!==c.height)resize();
    const W=c.width,H=c.height;
    ctx.clearRect(0,0,W,H);
    // Animated gradient bg
    const grd=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.6);
    grd.addColorStop(0,'rgba(255,31,53,0.055)');
    grd.addColorStop(.5,'rgba(255,31,53,0.02)');
    grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      pts.forEach(q=>{
        const d=Math.hypot(p.x-q.x,p.y-q.y);
        if(d<100){ctx.beginPath();ctx.strokeStyle=`rgba(255,31,53,${.1*(1-d/100)})`;ctx.lineWidth=.5;ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
      });
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(255,31,53,0.25)';ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════════
   CHAT VIEW
════════════════════════════════════════ */
function initChatView(){
  $('ciz-send')?.addEventListener('click',sendChat);
  $('chat-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}});
  $('ciz-mic')?.addEventListener('click',()=>S.voiceActive?stopVoice():startVoice());
  document.querySelectorAll('.wlc-card[data-prompt]').forEach(c=>{
    c.addEventListener('click',()=>{
      const p=c.dataset.prompt;
      if(p){$('chat-input').value=p;switchView('chat');sendChat();}
    });
  });
}

async function sendChat(){
  const raw=$('chat-input')?.value.trim();if(!raw)return;
  $('chat-input').value='';
  const welcome=$('chat-welcome');
  if(welcome&&!welcome.classList.contains('hidden'))welcome.classList.add('hidden');
  const feed=$('chat-feed');if(feed)feed.classList.remove('hidden');
  addMsg('user',raw);

  // Always try local commands/math first
  if(S.backendOnline&&!S.fallback){
    const tid=showTyping();
    $('ciz-send').disabled=true;
    try{
      const reply=await callChat(raw,S.model);
      remTyping(tid);$('ciz-send').disabled=false;
      addMsg('aria',reply,S.model);
    }catch(err){
      remTyping(tid);$('ciz-send').disabled=false;
      handleAPIError(err,raw);
    }
    return;
  }
  // Fallback
  await sleep(280+Math.random()*320);
  const fb=FB.handle(raw);
  if(fb)addMsg('aria',fb,null,'fallback');
}

async function callChat(msg,model){
  const res=await Promise.race([
    fetch(`${S.backendUrl}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,model})}),
    new Promise((_,r)=>setTimeout(()=>r(Object.assign(new Error('timeout'),{type:'timeout'})),20000)),
  ]);
  if(res.status===429)throw Object.assign(new Error('rate limit'),{type:'rate_limit'});
  if(res.status===401)throw Object.assign(new Error('auth'),{type:'auth'});
  if(!res.ok)throw Object.assign(new Error(`HTTP ${res.status}`),{type:'http'});
  const d=await res.json();return d.reply||d.message||'No response received.';
}

function handleAPIError(err,orig){
  const t=err.type||'unknown';
  let reply;
  if(t==='rate_limit'||err.message.includes('limit')||err.message.includes('quota')){
    S.backendOnline=false;setFallback(true);setStatus('offline','LIMIT');
    reply='Cloud AI limit reached — switching to local intelligence mode.\n\n'+FB.handle(orig);
  } else if(t==='auth'){
    reply=`API key issue — check your .env file.\n\n${FB.handle(orig)}`;
  } else {
    S.backendOnline=false;setFallback(true);setStatus('offline','OFFLINE');
    reply=`Connection lost — local mode active.\n\n${FB.handle(orig)}`;
  }
  addMsg('aria',reply,null,'fallback');
}

/* ════════════════════════════════════════
   CHAT RENDERING
════════════════════════════════════════ */
function addMsg(role,text,model=null,badge=null,save=true){
  const ts=Date.now();
  if(save&&role!=='sys'){
    S.chat.push({role,text,model,ts});
    if(S.chat.length>200)S.chat.shift();
    localStorage.setItem(LS.CHAT,JSON.stringify(S.chat));
    updateMemStats();
  }
  renderMsg(role,text,model,badge,ts,true);
}

function renderMsg(role,text,model,badge,ts,anim){
  const feed=$('chat-feed');if(!feed)return;
  const isAria=role==='aria';
  const div=document.createElement('div');
  div.className=`msg ${role}`;
  if(!anim)div.style.animation='none';
  const mLabels={openai:'GPT-4o',claude:'Claude 3.5',gemini:'Gemini 1.5',deepseek:'DeepSeek'};
  const badgeHtml=isAria&&model
    ?`<div class="msg-badge">${mLabels[model]||model}</div>`
    :badge==='fallback'
    ?`<div class="msg-badge fallback">LOCAL INTELLIGENCE</div>`:'';
  const t=ts?new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
  div.innerHTML=`
    <div class="msg-av">${isAria?'AI':'YOU'}</div>
    <div class="msg-body">
      <div class="msg-role">${isAria?'ARIA':'YOU'}</div>
      <div class="msg-text">${boldify(text)}</div>
      ${badgeHtml}
      <div class="msg-ts">${t}</div>
    </div>`;
  feed.appendChild(div);
  scrollChat();
}

function renderChatHistory(){
  const feed=$('chat-feed');if(!feed)return;
  if(S.chat.length===0)return;
  $('chat-welcome')?.classList.add('hidden');
  feed.classList.remove('hidden');
  S.chat.forEach(m=>renderMsg(m.role,m.text,m.model,null,m.ts,false));
  scrollChat();
}

function showTyping(){
  const feed=$('chat-feed');if(!feed)return null;
  const id='ty-'+Date.now();
  const d=document.createElement('div');
  d.id=id;d.className='msg aria';
  d.innerHTML=`<div class="msg-av">AI</div><div class="msg-body"><div class="msg-role">ARIA</div><div class="msg-text"><div class="tdots"><div class="td"></div><div class="td"></div><div class="td"></div></div></div></div>`;
  feed.appendChild(d);scrollChat();return id;
}
function remTyping(id){if(id)$(id)?.remove();}
function scrollChat(){requestAnimationFrame(()=>{const f=$('chat-feed');if(f)f.scrollTop=f.scrollHeight;});}

function clearChat(){
  S.chat=[];localStorage.removeItem(LS.CHAT);
  const feed=$('chat-feed');if(feed){feed.innerHTML='';feed.classList.add('hidden');}
  $('chat-welcome')?.classList.remove('hidden');
  updateMemStats();toast('Chat cleared','info');
}

/* ════════════════════════════════════════
   NEURAL NETWORK CANVAS
════════════════════════════════════════ */
const NET={canvas:null,ctx:null,W:0,H:0,raf:null,particles:[],edgePs:[]};

const NODE_IDS=['user','gpt','claude','gemini','deepseek','judge'];
const EDGES=[
  ['user','gpt'],['user','claude'],['user','gemini'],['user','deepseek'],
  ['gpt','judge'],['claude','judge'],['gemini','judge'],['deepseek','judge'],
  ['gpt','claude'],['gemini','deepseek'],
];
const NODE_COLORS={
  user:'rgba(255,255,255,0.8)',
  gpt:'rgba(16,208,122,0.9)',claude:'rgba(245,166,35,0.9)',
  gemini:'rgba(77,159,255,0.9)',deepseek:'rgba(176,96,255,0.9)',
  judge:'rgba(255,31,53,0.9)',
};

function getNodePos(){
  const W=NET.W,H=NET.H;
  return {
    user:    {x:W*.5, y:H*.12},
    claude:  {x:W*.1, y:H*.45},
    gemini:  {x:W*.9, y:H*.45},
    deepseek:{x:W*.2, y:H*.78},
    gpt:     {x:W*.8, y:H*.78},
    judge:   {x:W*.5, y:H*.88},
  };
}

function initNeuralCanvas(){
  NET.canvas=$('neural-canvas');if(!NET.canvas)return;
  NET.ctx=NET.canvas.getContext('2d');
  resizeNeuralCanvas();
  window.addEventListener('resize',resizeNeuralCanvas);
  for(let i=0;i<20;i++)NET.particles.push(newNetPt());
  renderNet();
}

function newNetPt(){
  return{x:Math.random()*(NET.W||500),y:Math.random()*(NET.H||400),vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*.8+.2};
}

function resizeNeuralCanvas(){
  const stage=$('neural-stage');if(!stage||!NET.canvas)return;
  NET.W=NET.canvas.width=stage.offsetWidth;
  NET.H=NET.canvas.height=stage.offsetHeight;
  positionNodes();
}

function positionNodes(){
  if(!NET.W||!NET.H)return;
  const pos=getNodePos();
  const map={user:'nd-user',gpt:'nd-gpt',claude:'nd-claude',gemini:'nd-gemini',deepseek:'nd-deepseek',judge:'nd-judge'};
  Object.entries(map).forEach(([k,id])=>{
    const el=$(id);if(el&&pos[k]){el.style.left=pos[k].x+'px';el.style.top=pos[k].y+'px';}
  });
}

function spawnEdge(from,to,color,speed){
  const pos=getNodePos();
  const a=pos[from],b=pos[to];if(!a||!b)return;
  NET.edgePs.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,t:0,speed:speed||(0.006+Math.random()*0.006),color:color||'rgba(255,255,255,.7)',trail:[]});
}

function renderNet(){
  NET.raf=requestAnimationFrame(renderNet);
  const ctx=NET.ctx;if(!ctx||!NET.W)return;
  ctx.clearRect(0,0,NET.W,NET.H);

  const pos=getNodePos();
  const isActive=S.debating;

  // Ambient glow at center
  const ag=ctx.createRadialGradient(NET.W/2,NET.H/2,0,NET.W/2,NET.H/2,NET.W*.4);
  ag.addColorStop(0,isActive?'rgba(255,31,53,0.05)':'rgba(255,31,53,0.02)');
  ag.addColorStop(1,'transparent');
  ctx.fillStyle=ag;ctx.fillRect(0,0,NET.W,NET.H);

  // Draw edges
  EDGES.forEach(([a,b])=>{
    const pa=pos[a],pb=pos[b];if(!pa||!pb)return;
    const g=ctx.createLinearGradient(pa.x,pa.y,pb.x,pb.y);
    const al=isActive?.18:.07;
    g.addColorStop(0,`rgba(255,255,255,${al})`);
    g.addColorStop(.5,`rgba(255,31,53,${al*1.6})`);
    g.addColorStop(1,`rgba(255,255,255,${al})`);
    ctx.beginPath();ctx.strokeStyle=g;ctx.lineWidth=isActive?1.2:.6;
    ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
  });

  // Edge particles
  for(let i=NET.edgePs.length-1;i>=0;i--){
    const ep=NET.edgePs[i];
    ep.t+=ep.speed;
    if(ep.t>=1){NET.edgePs.splice(i,1);continue;}
    const x=ep.ax+(ep.bx-ep.ax)*ep.t;
    const y=ep.ay+(ep.by-ep.ay)*ep.t;
    ep.trail.push({x,y,a:0.8});
    if(ep.trail.length>12)ep.trail.shift();
    // Draw trail
    ep.trail.forEach((pt,ti)=>{
      const alpha=pt.a*(ti/ep.trail.length);
      const rr=2.5*(ti/ep.trail.length);
      ctx.beginPath();ctx.arc(pt.x,pt.y,rr,0,Math.PI*2);
      ctx.fillStyle=ep.color.replace(/[\d.]+\)$/,`${alpha})`);ctx.fill();
    });
    // Glow dot
    const gr=ctx.createRadialGradient(x,y,0,x,y,16);
    gr.addColorStop(0,ep.color.replace(/[\d.]+\)$/,'0.5)'));
    gr.addColorStop(1,'transparent');
    ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
    ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle=ep.color;ctx.fill();
  }

  // Spawn particles during debate
  if(S.debating&&Math.random()<.06){
    const e=EDGES[Math.floor(Math.random()*EDGES.length)];
    const colors=Object.values(NODE_COLORS);
    spawnEdge(e[0],e[1],colors[Math.floor(Math.random()*colors.length)]);
  }

  // Background particles
  NET.particles.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=NET.W;if(p.x>NET.W)p.x=0;
    if(p.y<0)p.y=NET.H;if(p.y>NET.H)p.y=0;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fill();
  });
}

function setNode(id,state){
  const el=$('nd-'+id);const sd=$('nds-'+id);
  if(el){el.classList.remove('thinking','done');if(state!=='idle')el.classList.add(state);}
  if(sd){sd.className='nnd-status '+(state!=='idle'?state:'');}
}

function updateNsbText(text,state='active'){
  const el=$('nsb-text'),dot=$$('.nsb-dot');
  if(el)el.textContent=text;
  if(dot){dot.className='nsb-dot '+(state==='idle'?'':state);}
}

/* ════════════════════════════════════════
   DEBATE VIEW
════════════════════════════════════════ */
function initDebateView(){
  const tog=$('debate-toggle'),lbl=$('dib-mode');
  tog?.addEventListener('change',()=>{
    S.debateOn=tog.checked;
    if(lbl)lbl.textContent=S.debateOn?'DEBATE ACTIVE':'DEBATE OFF';
    toast(S.debateOn?'Debate mode activated':'Debate mode disabled','info');
  });
  $('debate-send')?.addEventListener('click',sendDebate);
  $('debate-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendDebate();}});
}

async function sendDebate(){
  if(S.debating)return;
  const q=$('debate-input')?.value.trim();if(!q)return;
  $('debate-input').value='';
  if(!S.debateOn){toast('Enable debate mode first','error');return;}

  S.debating=true;
  $('debate-send').disabled=true;

  // Hide idle overlay
  $('neural-idle')?.classList.add('hidden');

  // Clear panel
  const dp=$('dp-scroll');
  if(dp){dp.innerHTML='';const ql=document.createElement('div');ql.className='dp-qlabel';ql.textContent=q.length>55?q.slice(0,55)+'…':q;dp.appendChild(ql);}
  const badge=$('dph-badge');if(badge){badge.textContent='PROCESSING';badge.className='dph-badge active';}

  // Activate user node
  setNode('user','thinking');updateNsbText('USER request received — distributing to agents…');
  spawnEdge('user','gpt',NODE_COLORS.gpt);spawnEdge('user','claude',NODE_COLORS.claude);
  spawnEdge('user','gemini',NODE_COLORS.gemini);spawnEdge('user','deepseek',NODE_COLORS.deepseek);
  await sleep(500);setNode('user','done');

  // Activate all agents
  ['gpt','claude','gemini','deepseek'].forEach(n=>setNode(n,'thinking'));
  updateNsbText('GPT · Claude · Gemini · DeepSeek analyzing simultaneously…');

  if(!S.backendOnline||S.fallback){
    await runFallbackDebate(q,dp);
  } else {
    let result=null;
    try{
      const res=await Promise.race([
        fetch(`${S.backendUrl}/api/debate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})}),
        new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),28000)),
      ]);
      if(res.status===429||res.status===401){setFallback(true);throw Object.assign(new Error('limit'),{type:'rate_limit'});}
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      result=await res.json();
    }catch(err){
      ['gpt','claude','gemini','deepseek','judge'].forEach(n=>setNode(n,'idle'));
      await runFallbackDebate(q,dp);
      S.debating=false;$('debate-send').disabled=false;
      return;
    }

    // Stream agent responses
    const agents=[
      {key:'claude',nodeId:'claude',color:NODE_COLORS.claude,colorHex:'#f5a623',label:'CLAUDE',tag:'Anthropic'},
      {key:'gemini',nodeId:'gemini',color:NODE_COLORS.gemini,colorHex:'#4d9fff',label:'GEMINI',tag:'Google'},
      {key:'deepseek',nodeId:'deepseek',color:NODE_COLORS.deepseek,colorHex:'#b060ff',label:'DEEPSEEK',tag:'DeepSeek AI'},
      {key:'openai',nodeId:'gpt',color:NODE_COLORS.gpt,colorHex:'#10d07a',label:'GPT-4o',tag:'OpenAI'},
    ];

    for(const ag of agents){
      const text=result[ag.key==='.openai'?'openai':ag.key];
      if(!text)continue;
      setNode(ag.nodeId,'done');
      updateNsbText(`${ag.label} response received — forwarding to Judge…`);
      spawnEdge(ag.nodeId,'judge',ag.color);
      const card=makeAgentCard(ag.label,ag.tag,ag.colorHex);
      dp.appendChild(card.el);
      await streamCard(card.body,text);
      await sleep(150);
    }

    // Judge
    updateNsbText('FINAL JUDGE synthesizing all perspectives…');
    setNode('judge','thinking');
    ['claude','gemini','deepseek','gpt'].forEach((n,i)=>setTimeout(()=>spawnEdge(n,'judge','rgba(255,31,53,0.95)'),i*150));
    await sleep(1000);
    if(result.openai_judgment){
      setNode('judge','done');
      updateNsbText('VERDICT delivered.',  'done');
      const jc=makeJudgeCard();dp.appendChild(jc.el);
      await streamCard(jc.body,result.openai_judgment);
    }
  }

  S.debates++;localStorage.setItem(LS.DCOUNT,S.debates);updateMemStats();
  if(badge){badge.textContent='COMPLETE';badge.className='dph-badge done';}
  dp?.scrollTo({top:dp.scrollHeight,behavior:'smooth'});
  S.debating=false;$('debate-send').disabled=false;
}

async function runFallbackDebate(q,dp){
  const fallbacks=[
    {label:'STRATEGIC ANALYSIS',tag:'Local Intel',colorHex:'#f5a623',
      text:`Strategic perspective on "${q}":\n\nFocus on asymmetric leverage — which single action creates the most compounding optionality? Map the decision space: reversible early moves vs. irreversible commitments. The highest-leverage path usually involves testing a core assumption with minimum viable resources before full commitment. Identify which variable, if proven wrong, collapses the entire thesis.`},
    {label:'CRITICAL CHALLENGE',tag:'Local Intel',colorHex:'#4d9fff',
      text:`Adversarial analysis of "${q}":\n\nWhat is the hidden assumption that breaks this entire premise if wrong? Most strategic failures stem not from poor execution but from an unquestioned foundational belief. The Critic's job: find the one question everyone is afraid to ask. Challenge the market size assumption, the timing assumption, and the capability assumption — usually all three are optimistic.`},
    {label:'REALIST ASSESSMENT',tag:'Local Intel',colorHex:'#b060ff',
      text:`Ground-reality assessment of "${q}":\n\nTheory is cheap; execution is where ideas die. What resources, timeline, and capabilities does this actually require? Where do 80% of attempts at this fail, and why? Account for the "execution discount" — plans take 2-3x longer and cost 2-3x more than projected. What does success actually look like on Day 1, Day 100, and Year 3?`},
  ];

  for(const ag of fallbacks){
    const n={claude:'claude',gemini:'gemini',deepseek:'deepseek'}[ag.label.split(' ')[0].toLowerCase()]||'gpt';
    setNode('gpt','done');setNode('claude','done');setNode('gemini','done');setNode('deepseek','done');
    const card=makeAgentCard(ag.label,ag.tag,ag.colorHex);
    dp.appendChild(card.el);await streamCard(card.body,ag.text);await sleep(200);
  }
  setNode('judge','thinking');
  updateNsbText('FINAL JUDGE synthesizing…');
  await sleep(700);
  setNode('judge','done');updateNsbText('VERDICT delivered.','done');
  const math=FB.math(q);
  const verdict=math
    ?`Calculation: ${math}\n\nFor full multi-model debate, connect backend with valid API keys.`
    :`Final synthesis on "${q}":\n\nThe Strategic view highlights leverage and optionality as the core variables. The Critical challenge reveals that the key unexamined assumption is likely around timing or market readiness. The Realist assessment grounds this in execution reality.\n\nVerdict: Begin with a minimum viable test that proves or disproves the most dangerous assumption, before committing significant resources. This is the move that survives all three critiques.\n\n⚠ Local intelligence mode — cloud AI will deliver higher-quality debate when API keys are connected.`;
  const jc=makeJudgeCard();dp.appendChild(jc.el);await streamCard(jc.body,verdict);
}

function makeAgentCard(label,tag,colorHex){
  const el=document.createElement('div');el.className='dp-card';
  const body=document.createElement('div');body.className='dp-card-body';
  el.innerHTML=`<div class="dp-card-hdr"><div class="dp-cbar" style="background:${colorHex}"></div><div class="dp-cname" style="color:${colorHex}">${label}</div><div class="dp-ctag">${tag}</div></div>`;
  el.appendChild(body);return{el,body};
}
function makeJudgeCard(){
  const el=document.createElement('div');el.className='dp-judge-card';
  const body=document.createElement('div');body.className='dp-jc-body';
  el.innerHTML=`<div class="dp-jc-hdr"><div class="dp-jc-title">⚖ FINAL JUDGMENT</div><div class="dp-jc-badge">VERDICT</div></div>`;
  el.appendChild(body);return{el,body};
}

async function streamCard(el,text,speed=11){
  el.textContent='';el.classList.add('streaming');
  const dp=$('dp-scroll');
  for(let i=0;i<text.length;i++){
    el.textContent+=text[i];
    if(i%7===0){if(dp)dp.scrollTop=dp.scrollHeight;await sleep(speed+Math.random()*4);}
  }
  el.classList.remove('streaming');
}

/* ════════════════════════════════════════
   VOICE VIEW
════════════════════════════════════════ */
let waveAnim=null;
function initVoiceView(){
  $('vc-mic-btn')?.addEventListener('click',()=>S.voiceActive?stopVoice():startVoice());
  drawVoiceWave(false);
}

function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Voice input requires Chrome or Edge','error');return;}
  if(!S.recognition){
    S.recognition=new SR();
    S.recognition.continuous=false;S.recognition.interimResults=false;S.recognition.lang='en-US';
    S.recognition.onresult=e=>{
      const t=e.results[0][0].transcript.trim();
      $('vc-transcript').textContent='"'+t+'"';
      $('chat-input').value=t;
      stopVoice();switchView('chat');sendChat();
    };
    S.recognition.onerror=()=>stopVoice();
    S.recognition.onend=()=>{if(S.voiceActive)try{S.recognition.start();}catch{}};
  }
  S.voiceActive=true;
  $('ciz-mic')?.classList.add('active');
  $('voice-scene')?.classList.add('listening');
  $('vc-status').textContent='LISTENING…';
  drawVoiceWave(true);
  try{S.recognition.start();}catch{}
  toast('Voice mode — speak now','info');
}

function stopVoice(){
  S.voiceActive=false;
  $('ciz-mic')?.classList.remove('active');
  $('voice-scene')?.classList.remove('listening');
  $('vc-status').textContent='CLICK TO SPEAK';
  drawVoiceWave(false);
  if(S.recognition)try{S.recognition.stop();}catch{}
}

function drawVoiceWave(active){
  const c=$('vc-wave-canvas');if(!c)return;
  c.width=300;c.height=60;
  const ctx=c.getContext('2d');
  if(waveAnim)cancelAnimationFrame(waveAnim);
  let t=0;
  function draw(){
    if(!$('view-voice')?.classList.contains('active'))return;
    ctx.clearRect(0,0,300,60);
    ctx.beginPath();
    for(let x=0;x<300;x++){
      const amp=active?(Math.sin(t*.08)*8+Math.sin(t*.13+x*.04)*5+12):3;
      const y=30+Math.sin(x*.04+t*.06)*amp;
      x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.strokeStyle=active?'rgba(255,31,53,0.7)':'rgba(255,255,255,0.1)';
    ctx.lineWidth=1.5;ctx.stroke();
    t++;waveAnim=requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════════
   MARKETS CHIPS
════════════════════════════════════════ */
function initMarketsChips(){
  document.querySelectorAll('.mktq-chip[data-prompt]').forEach(c=>{
    c.addEventListener('click',()=>{
      if(c.dataset.prompt){$('chat-input').value=c.dataset.prompt;switchView('chat');sendChat();}
    });
  });
}

/* ════════════════════════════════════════
   MEMORY STATS
════════════════════════════════════════ */
function updateMemStats(){
  const msgs=$('mem-msgs'),deb=$('mem-debates'),days=$('mem-days'),sess=$('mem-sessions');
  if(msgs)msgs.textContent=S.chat.length;
  if(deb)deb.textContent=S.debates;
  const first=parseInt(localStorage.getItem(LS.FIRST)||Date.now());
  if(days)days.textContent=Math.max(1,Math.round((Date.now()-first)/86400000));
  if(sess)sess.textContent=parseInt(localStorage.getItem('av5_sessions')||'1');
}

/* ════════════════════════════════════════
   SETTINGS MODAL
════════════════════════════════════════ */
function initSettings(){
  $('sb-settings')?.addEventListener('click',openModal);
  $('mp-close')?.addEventListener('click',closeModal);
  $('mp-cancel')?.addEventListener('click',closeModal);
  $('mp-save')?.addEventListener('click',saveModal);
  $('modal-settings')?.addEventListener('click',e=>{if(e.target===$('modal-settings'))closeModal();});
}
function openModal(){
  $('set-backend').value=S.backendUrl;
  $('set-model').value=S.model;
  $('set-name').value=S.userName;
  $('set-stay').checked=localStorage.getItem(LS.STAY)!=='false';
  $('modal-settings').classList.remove('hidden');
}
function closeModal(){$('modal-settings').classList.add('hidden');}
function saveModal(){
  S.backendUrl=$('set-backend').value.trim().replace(/\/$/,'')||CFG.BACKEND;
  S.model=$('set-model').value;
  S.userName=$('set-name').value.trim()||CFG.USER;
  const stay=$('set-stay').checked;
  const newPin=$('set-pin')?.value.trim();
  if(newPin&&/^\d{4}$/.test(newPin)){localStorage.setItem('av5_pin',newPin);toast('PIN changed','success');}
  localStorage.setItem(LS.BACK,S.backendUrl);
  localStorage.setItem(LS.MOD,S.model);
  localStorage.setItem(LS.USER,S.userName);
  localStorage.setItem(LS.STAY,stay?'true':'false');
  closeModal();toast('Settings saved','success');checkBackend();
}

/* ════════════════════════════════════════
   LOCK
════════════════════════════════════════ */
function lockSession(){
  S.authenticated=false;localStorage.removeItem(LS.AUTH);
  S.pin='';updDots();$('pin-err')?.classList.add('hidden');
  $('s-app').classList.remove('active');
  trans('s-app','s-pin');initPinCanvas();toast('Session locked','info');
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function toast(msg,type='info',dur=3200){
  const c=$('toasts');if(!c)return;
  const el=document.createElement('div');
  el.className=`toast ${type}`;el.textContent=msg;c.appendChild(el);
  setTimeout(()=>{el.style.animation='toastOut .3s ease forwards';setTimeout(()=>el.remove(),300);},dur);
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initPin();
  runBoot();
  // Session counter
  const sc=parseInt(localStorage.getItem('av5_sessions')||'0')+1;
  localStorage.setItem('av5_sessions',sc);
});

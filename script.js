const W=1000,H=640,R=18,TARGET=30;
const COLORS=[['#00e5ff','#a8f7ff'],['#ff2bd6','#ffb0f2'],['#ffd447','#fff0a8'],['#7cff4d','#d3ffbf'],['#ff6a3d','#ffc9b8'],['#a66bff','#dccaff']];
const ICE={config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:global.stun.twilio.com:3478'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}]}};
const TREES=[[110,110],[300,80],[180,270],[480,190],[80,430],[340,440],[540,550],[720,110],[890,300],[770,510],[910,580],[130,580],[620,340]];
const ROCKS=[[650,230],[830,130],[420,330],[250,540],[950,440]];
const PATH=[[-50,300],[250,330],[520,420],[800,380],[1050,250]];
const OBS=[...TREES.map(([x,y])=>({x,y,r:32})),...ROCKS.map(([x,y])=>({x,y,r:20}))];
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id))}

/* ---------- SIMULAÇÃO ---------- */
function mk(i,name,bot){const a=i/6*6.283+.3;return{id:i,name,bot:!!bot,x:500+Math.cos(a)*280,y:320+Math.sin(a)*220,vx:0,vy:0,a:0,dash:0,cd:0,stun:0,inv:0,score:0,in:{dx:0,dy:0,d:0}}}
function newState(names,bots){return{t:0,k:-1,over:false,win:-1,p:names.map((n,i)=>mk(i,n,bots&&bots[i]))}}
function wall(p){
  for(const o of OBS){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy),m=o.r+R;if(d<m&&d>0){p.x=o.x+dx/d*m;p.y=o.y+dy/d*m}}
  p.x=Math.max(R,Math.min(W-R,p.x));p.y=Math.max(R,Math.min(H-R,p.y));
}
function ai(S,p){
  const kp=S.k>=0?S.p[S.k]:null;let dx,dy;
  if(kp===p){
    let n=null,nd=1e9;for(const q of S.p)if(q!==p){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<nd){nd=d;n=q}}
    dx=p.x-n.x;dy=p.y-n.y;const dd=Math.hypot(dx,dy)||1;dx=dx/dd+(500-p.x)/450;dy=dy/dd+(320-p.y)/450;
    if(nd<90&&Math.random()<.03)p.in.d=1;
  }else{
    const tx=kp?kp.x:500,ty=kp?kp.y:320;dx=tx-p.x;dy=ty-p.y;
    if(Math.hypot(dx,dy)<120&&Math.random()<.04)p.in.d=1;
  }
  const l=Math.hypot(dx,dy)||1;p.in.dx=dx/l;p.in.dy=dy/l;
}
function step(S,dt){
  if(S.over)return;
  S.t+=dt;
  for(const p of S.p){
    if(p.bot)ai(S,p);
    const inp=p.in;let dx=inp.dx,dy=inp.dy;const m=Math.min(1,Math.hypot(dx,dy));
    if(m>0){const l=Math.hypot(dx,dy);dx/=l;dy/=l}
    p.cd=Math.max(0,p.cd-dt);p.stun=Math.max(0,p.stun-dt);p.inv=Math.max(0,p.inv-dt);p.dash=Math.max(0,p.dash-dt);
    if(m>.1&&p.stun<=0&&p.dash<=0)p.a=Math.atan2(dy,dx);
    if(inp.d&&p.cd<=0&&p.stun<=0){p.dash=.22;p.cd=1.3}
    inp.d=0;
    let sp=p.stun>0?0:(p.dash>0?520:(S.k===p.id?175:200));if(p.bot)sp*=.92;
    if(p.dash>0){p.vx=Math.cos(p.a)*sp;p.vy=Math.sin(p.a)*sp}
    else{const f=Math.min(1,dt*12);p.vx+=(dx*m*sp-p.vx)*f;p.vy+=(dy*m*sp-p.vy)*f}
    p.x+=p.vx*dt;p.y+=p.vy*dt;wall(p);
  }
  for(let i=0;i<S.p.length;i++)for(let j=i+1;j<S.p.length;j++){
    const a=S.p[i],b=S.p[j];let dx=b.x-a.x,dy=b.y-a.y;const d=Math.hypot(dx,dy);
    if(d<R*2&&d>0){
      const o=(R*2-d)/2;dx/=d;dy/=d;a.x-=dx*o;a.y-=dy*o;b.x+=dx*o;b.y+=dy*o;
      hit(S,a,b);hit(S,b,a);
    }
  }
  if(S.k<0){for(const p of S.p)if(p.stun<=0&&Math.hypot(p.x-500,p.y-320)<30){S.k=p.id;p.inv=1;break}}
  else{const p=S.p[S.k];p.score+=dt;if(p.score>=TARGET){S.over=true;S.win=p.id}}
}
function hit(S,at,vi){
  if(at.dash<=0||vi.inv>0||vi.stun>0)return;
  vi.stun=.6;vi.vx=Math.cos(at.a)*420;vi.vy=Math.sin(at.a)*420;at.dash=.05;
  if(S.k===vi.id){S.k=at.id;at.inv=1.2}
}

/* ---------- ENTRADA ---------- */
const keys={};let dashA=false,dashB=false,ts={dx:0,dy:0};
addEventListener('keydown',e=>{
  if(document.activeElement&&/INPUT|SELECT/.test(document.activeElement.tagName))return;
  keys[e.code]=true;
  if(['Space','ShiftLeft'].includes(e.code))dashA=true;
  if(['Enter','NumpadEnter','ShiftRight'].includes(e.code)){if(mode==='local')dashB=true;else dashA=true}
  if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();
});
addEventListener('keyup',e=>keys[e.code]=false);
function kb(l,r,u,d){return{dx:(keys[r]?1:0)-(keys[l]?1:0),dy:(keys[d]?1:0)-(keys[u]?1:0)}}
function inputA(){const a=kb('KeyA','KeyD','KeyW','KeyS');let dx=a.dx+ts.dx,dy=a.dy+ts.dy;
  if(mode!=='local'){const b=kb('ArrowLeft','ArrowRight','ArrowUp','ArrowDown');dx+=b.dx;dy+=b.dy}
  return{dx:Math.max(-1,Math.min(1,dx)),dy:Math.max(-1,Math.min(1,dy))}}
// touch
const touchEl=$('touch'),stick=$('stick'),knob=$('knob');
if('ontouchstart' in window||navigator.maxTouchPoints>0)touchEl.style.display='block';
let sid=null;
stick.addEventListener('pointerdown',e=>{sid=e.pointerId;stick.setPointerCapture(sid);mv(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===sid)mv(e)});
const rel=e=>{if(e.pointerId===sid){sid=null;ts={dx:0,dy:0};knob.style.left='35px';knob.style.top='35px'}};
stick.addEventListener('pointerup',rel);stick.addEventListener('pointercancel',rel);
function mv(e){const r=stick.getBoundingClientRect();let x=e.clientX-r.left-65,y=e.clientY-r.top-65;const d=Math.hypot(x,y),m=50;
  if(d>m){x=x/d*m;y=y/d*m}ts={dx:x/m,dy:y/m};knob.style.left=35+x+'px';knob.style.top=35+y+'px'}
$('dashbtn').addEventListener('pointerdown',e=>{e.preventDefault();dashA=true});

/* ---------- ESTADO GERAL ---------- */
let mode='',S=null,me=0,endShown=false,last=0,snapT=0,netT=0;
let peer=null,conn=null,conns=[],lobbyNames=[],started=false;

function begin(names,bots,m,idx){
  mode=m;me=idx;S=newState(names,bots);endShown=false;started=true;
  $('end').classList.remove('on');show('game');resize();try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
  $('bAgain').style.display=(m==='client')?'none':'';
}
/* ---------- MENUS ---------- */
$('bOnline').onclick=()=>{$('msg').textContent='';show('online')};
$('bLocal').onclick=()=>show('localcfg');
$('bBack1').onclick=()=>show('menu');$('bBack2').onclick=()=>show('menu');
const sel=$('nplay');for(let i=2;i<=6;i++)sel.add(new Option(i+' jogadores',i));sel.value=4;
$('bLStart').onclick=()=>{
  const n=+sel.value;const names=[],bots=[];
  for(let i=0;i<n;i++){names.push(i<2?'Jogador '+(i+1):'Bot '+(i-1));bots.push(i>=2)}
  begin(names,bots,'local',0);
};
$('exit').onclick=leave;$('bMenu').onclick=leave;
$('bAgain').onclick=()=>{
  if(mode==='local'){const names=S.p.map(p=>p.name),bots=S.p.map(p=>p.bot);begin(names,bots,'local',0)}
  else if(mode==='host'){started=false;broadcast({t:'back'});toLobby()}
};
function leave(){
  started=false;S=null;mode='';
  if(conn){try{conn.close()}catch(e){}conn=null}
  if(peer){try{peer.destroy()}catch(e){}peer=null}
  conns=[];show('menu');
}
const nm=()=>($('pname').value.trim()||'Jogador').slice(0,12);
function say(t){$('msg').textContent=t}

/* ---------- ONLINE: ANFITRIÃO ---------- */
$('bCreate').onclick=()=>{
  if(typeof Peer==='undefined')return say('Sem conexão com o servidor online.');
  createRoom();
};
function createRoom(){
  const code=Array.from({length:4},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');
  say('Criando sala...');
  const p=new Peer('kyard-'+code,ICE);peer=p;
  p.on('open',()=>{mode='host';lobbyNames=[nm()];conns=[];$('roomcode').textContent=code;toLobby()});
  p.on('error',e=>{if(e.type==='unavailable-id'){p.destroy();createRoom()}else say('Erro: '+e.type)});
  p.on('disconnected',()=>{try{p.reconnect()}catch(e){}});
  p.on('connection',c=>{
    c.on('data',d=>hostData(c,d));
    c.on('close',()=>dropConn(c));
  });
}
function toLobby(){started=false;show('lobby');renderLobby()}
function renderLobby(){
  $('plist').innerHTML=lobbyNames.map((n,i)=>`<li><span class="dot" style="background:${COLORS[i][0]}"></span>${esc(n)}${i===0?' 👑':''}</li>`).join('');
  const host=mode==='host';
  $('bStart').style.display=host?'':'none';
  $('lmsg').textContent=host?(lobbyNames.length<2?'Aguardando mais jogadores (mín. 2)...':lobbyNames.length+'/6 jogadores'):'Aguardando o anfitrião iniciar...';
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function broadcast(m){for(const c of conns)if(c.open)c.send(m)}
function sendLobby(){conns.forEach((c,i)=>{if(c.open)c.send({t:'lobby',names:lobbyNames,you:i+1})});renderLobby()}
function hostData(c,d){
  if(d.t==='join'){
    if(started||lobbyNames.length>=6){c.send({t:'full'});return}
    conns.push(c);lobbyNames.push(String(d.name||'Jogador').slice(0,12));sendLobby();
  }else if(d.t==='in'){
    const i=conns.indexOf(c)+1;if(!S||i<1||!S.p[i])return;
    const inp=S.p[i].in;inp.dx=Math.max(-1,Math.min(1,+d.dx||0));inp.dy=Math.max(-1,Math.min(1,+d.dy||0));if(d.d)inp.d=1;
  }
}
function dropConn(c){
  const i=conns.indexOf(c);if(i<0)return;
  conns.splice(i,1);
  if(started&&S){const p=S.p[i+1];if(p){p.bot=true;p.name+=' (bot)'}
    // reindexa conexões: mantém jogador como bot sem deslocar ids
    conns.splice(i,0,{open:false,send(){}});
  }else{lobbyNames.splice(i+1,1);sendLobby()}
}
$('bStart').onclick=()=>{
  if(lobbyNames.length<2)return;
  started=true;broadcast({t:'start',names:lobbyNames});
  begin(lobbyNames.slice(),null,'host',0);
};
$('bLeave').onclick=leave;

/* ---------- ONLINE: CLIENTE ---------- */
$('bJoin').onclick=()=>{
  const code=$('code').value.trim().toUpperCase();
  if(code.length!==4)return say('Digite o código de 4 letras.');
  if(typeof Peer==='undefined')return say('Sem conexão com o servidor online.');
  say('Conectando...');
  const p=new Peer(ICE);peer=p;
  p.on('error',e=>{say(e.type==='peer-unavailable'?'Sala não encontrada.':'Erro: '+e.type)});
  p.on('open',()=>{
    conn=p.connect('kyard-'+code,{reliable:true});
    const to=setTimeout(()=>{if(mode!=='client'){leave();show('online');say('Não foi possível conectar. Confira o código e a internet.')}},12000);
    conn.on('open',()=>{clearTimeout(to);mode='client';conn.send({t:'join',name:nm()});$('roomcode').textContent=code});
    conn.on('data',clientData);
    conn.on('close',()=>{if(mode==='client'){alert('Conexão com a sala encerrada.');leave()}});
  });
};
function clientData(d){
  if(d.t==='full'){say('Sala cheia ou jogo já iniciado.');leave();show('online');say('Sala cheia ou jogo já iniciado.')}
  else if(d.t==='lobby'){lobbyNames=d.names;me=d.you;if(!started)toLobby()}
  else if(d.t==='start'){begin(d.names,null,'client',me)}
  else if(d.t==='back'){toLobby()}
  else if(d.t==='s'&&S){
    S.t=d.t2;S.k=d.k;S.over=d.o;S.win=d.w;
    d.p.forEach((a,i)=>{const p=S.p[i];if(!p)return;
      p.x=a[0];p.y=a[1];p.a=a[2];p.dash=a[3];p.stun=a[4];p.inv=a[5];p.score=a[6];p.cd=a[7];p.bot=!!a[8]});
  }
}
function snap(){return{t:'s',t2:S.t,k:S.k,o:S.over,w:S.win,p:S.p.map(p=>[Math.round(p.x),Math.round(p.y),+p.a.toFixed(2),p.dash>0?1:0,+p.stun.toFixed(2),+p.inv.toFixed(2),+p.score.toFixed(1),+p.cd.toFixed(2),p.bot?1:0])}}

/* ---------- DESENHO ---------- */
const cv=$('cv'),ctx=cv.getContext('2d');let cw=0,ch=0,dpr=1;
function resize(){dpr=window.devicePixelRatio||1;cw=innerWidth;ch=innerHeight;cv.width=cw*dpr;cv.height=ch*dpr}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,250));

function hex(c,x,y,r){c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;c[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r)}c.closePath()}
function tree(c,x,y){
  c.save();c.fillStyle='rgba(0,229,255,.07)';hex(c,x,y,50);c.fill();
  c.strokeStyle='#00e5ff';c.lineWidth=3;c.shadowColor='#00e5ff';c.shadowBlur=14;c.fillStyle='#07263a';hex(c,x,y,40);c.fill();c.stroke();
  c.shadowBlur=0;c.strokeStyle='rgba(0,229,255,.5)';c.lineWidth=2;hex(c,x,y,25);c.stroke();
  c.fillStyle='#00e5ff';c.beginPath();c.arc(x,y,5,0,7);c.fill();c.restore();
}
function rock(c,x,y){
  c.save();c.strokeStyle='#ff2bd6';c.shadowColor='#ff2bd6';c.shadowBlur=12;c.lineWidth=3;c.fillStyle='#2a0a2e';
  c.beginPath();c.moveTo(x,y-24);c.lineTo(x+18,y-6);c.lineTo(x+12,y+20);c.lineTo(x-14,y+18);c.lineTo(x-19,y-4);c.closePath();c.fill();c.stroke();c.restore();
}
function crown(c,x,y,s,alpha){
  c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=alpha;c.fillStyle='#ffd447';c.strokeStyle='#fff3b0';c.lineWidth=2.5;c.lineJoin='round';c.shadowColor='#ffd447';c.shadowBlur=14;
  c.beginPath();c.moveTo(-11,0);c.lineTo(-12,-18);c.lineTo(-5,-10);c.lineTo(0,-21);c.lineTo(5,-10);c.lineTo(12,-18);c.lineTo(11,0);c.closePath();c.fill();c.stroke();c.restore();
}
function drawPlayer(c,p,k,isMe){
  c.save();c.translate(p.dx,p.dy);
  const al=(p.inv>0&&Math.floor(S.t*14)%2)?.55:1,col=COLORS[p.id];c.globalAlpha=al;
  c.globalAlpha=al*.75;c.strokeStyle=col[0];c.lineWidth=2;c.shadowColor=col[0];c.shadowBlur=16;c.beginPath();c.arc(0,0,isMe?31:26,0,7);c.stroke();c.shadowBlur=0;c.globalAlpha=al;
  if(p.dash>0){c.strokeStyle=col[1];c.globalAlpha=al*.6;c.lineWidth=5;c.lineCap='round';
    for(const o of[-8,8]){const q=p.a+1.57;c.beginPath();c.moveTo(-Math.cos(p.a)*18+Math.cos(q)*o,-Math.sin(p.a)*18+Math.sin(q)*o);c.lineTo(-Math.cos(p.a)*50+Math.cos(q)*o,-Math.sin(p.a)*50+Math.sin(q)*o);c.stroke()}c.globalAlpha=al}
  c.lineWidth=3;c.strokeStyle='#050b14';c.fillStyle=col[1];
  const sp=p.dash>0?.5:1,off=p.dash>0?27:21;
  for(const s of[-1,1]){const a=p.a+s*sp;c.beginPath();c.arc(Math.cos(a)*off,Math.sin(a)*off,7,0,7);c.stroke();c.fill()}
  c.fillStyle=col[0];c.beginPath();c.ellipse(0,2,19,16,0,0,7);c.stroke();c.fill();
  c.fillStyle='#0a1624';c.strokeStyle=col[1];c.lineWidth=2;c.beginPath();c.arc(0,-1,13,0,7);c.fill();c.stroke();
  if(k)crown(c,0,-9,1.1,1);
  if(p.stun>0){c.fillStyle='#8ff3ff';for(let i=0;i<3;i++){const a=S.t*6+i*2.1;c.beginPath();c.arc(Math.cos(a)*26,Math.sin(a)*14-18,4,0,7);c.fill()}}
  c.globalAlpha=1;c.font='bold 12px Orbitron,Arial,sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#050b14';c.fillStyle=col[1];
  const label=isMe?p.name+' ▲':p.name;c.strokeText(label,0,42);c.fillText(label,0,42);
  c.restore();
}
function draw(){
  const z=Math.max(Math.min(cw/W,ch/H),Math.min(Math.min(cw,ch)/460,1.3));
  const vw=cw/z,vh=ch/z,mp=S.p[me]||S.p[0];
  const cx=vw<W?Math.max(vw/2,Math.min(W-vw/2,mp.dx)):W/2,cy=vh<H?Math.max(vh/2,Math.min(H-vh/2,mp.dy)):H/2;
  const c=ctx;c.setTransform(1,0,0,1,0,0);c.fillStyle='#02060c';c.fillRect(0,0,cv.width,cv.height);
  c.setTransform(dpr*z,0,0,dpr*z,dpr*(cw/2-cx*z),dpr*(ch/2-cy*z));
  c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
  const g=c.createRadialGradient(500,320,50,500,320,640);g.addColorStop(0,'#0c2438');g.addColorStop(1,'#050d18');c.fillStyle=g;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(0,229,255,.08)';c.lineWidth=1;c.beginPath();for(let x=0;x<=W;x+=50){c.moveTo(x,0);c.lineTo(x,H)}for(let y=0;y<=H;y+=50){c.moveTo(0,y);c.lineTo(W,y)}c.stroke();
  c.lineJoin='round';
  const path=()=>{c.beginPath();c.moveTo(PATH[0][0],PATH[0][1]);for(let i=1;i<PATH.length-1;i++){const a=PATH[i],b=PATH[i+1];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}c.lineTo(PATH[PATH.length-1][0],PATH[PATH.length-1][1])};
  path();c.strokeStyle='rgba(0,229,255,.55)';c.lineWidth=130;c.shadowColor='#00e5ff';c.shadowBlur=18;c.stroke();c.shadowBlur=0;
  path();c.strokeStyle='#0a2236';c.lineWidth=122;c.stroke();
  path();c.strokeStyle='rgba(0,229,255,.25)';c.lineWidth=2;c.setLineDash([16,14]);c.stroke();c.setLineDash([]);
  for(const [x,y] of ROCKS)rock(c,x,y);
  for(const [x,y] of TREES)tree(c,x,y);
  if(S.k<0){const pl=1+Math.sin(performance.now()/200)*.15;c.strokeStyle='rgba(255,212,71,.7)';c.lineWidth=2;c.beginPath();c.arc(500,320,34*pl,0,7);c.stroke();c.fillStyle='rgba(255,212,71,.15)';c.fill();crown(c,500,330,1.8,1)}
  for(const p of S.p.slice().sort((a,b)=>a.dy-b.dy))drawPlayer(c,p,S.k===p.id,p.id===me&&mode!=='local');
  c.restore();
  c.strokeStyle='#00e5ff';c.lineWidth=6;c.shadowColor='#00e5ff';c.shadowBlur=20;c.strokeRect(0,0,W,H);c.shadowBlur=0;
}

/* ---------- LOOP ---------- */
let hudT=0;
function frame(t){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(!S||!$('game').classList.contains('on'))return;
  if(mode==='client'){
    netT+=dt;if(netT>.05&&conn&&conn.open){netT=0;const i=inputA();conn.send({t:'in',dx:i.dx,dy:i.dy,d:dashA?1:0});dashA=false}
  }else{
    const a=inputA(),p0=S.p[0];p0.in.dx=a.dx;p0.in.dy=a.dy;if(dashA){p0.in.d=1;dashA=false}
    if(mode==='local'&&S.p[1]&&!S.p[1].bot){const b=kb('ArrowLeft','ArrowRight','ArrowUp','ArrowDown');S.p[1].in.dx=b.dx;S.p[1].in.dy=b.dy;if(dashB){S.p[1].in.d=1;dashB=false}}
    step(S,dt);
    if(mode==='host'){snapT+=dt;if(snapT>.05){snapT=0;broadcast(snap())}}
  }
  for(const p of S.p){
    if(p.dx===undefined||mode!=='client'){p.dx=p.x;p.dy=p.y}
    else{p.dx+=(p.x-p.dx)*.4;p.dy+=(p.y-p.dy)*.4}
    if(mode==='client'){p.dash=p.dash>0?.1:0}
  }
  hudT+=dt;if(hudT>.1){hudT=0;hud()}
  if(S.over&&!endShown){endShown=true;const w=S.p[S.win];$('etitle').textContent='👑 '+(w?w.name:'?')+' venceu!';$('end').classList.add('on')}
  draw();
}
function hud(){
  $('hud').innerHTML=S.p.map(p=>`<div class="chip ${S.k===p.id?'king':''}"><span class="dot" style="background:${COLORS[p.id][0]};width:11px;height:11px"></span>${esc(p.name)} ${S.k===p.id?'👑':''} ${Math.floor(p.score)}/${TARGET}</div>`).join('');
  const m=S.p[me];if(m)$('dashbtn').style.setProperty('--cd',Math.min(360,m.cd/1.3*360)+'deg');
}
$('full').onclick=()=>{const d=document,e=d.documentElement;if(d.fullscreenElement||d.webkitFullscreenElement)(d.exitFullscreen||d.webkitExitFullscreen).call(d);else((e.requestFullscreen||e.webkitRequestFullscreen)||(()=>{})).call(e)};
requestAnimationFrame(frame);

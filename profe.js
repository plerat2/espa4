import { auth, rtdb } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const PROFESSOR_EMAIL = "josepantonipeiro@cepallevant.eu";

const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const filterEmail = document.getElementById("filterEmail");
const limitSel = document.getElementById("limitSel");
const viewSel = document.getElementById("viewSel");
const activitySel = document.getElementById("activitySel");

const studentsSection = document.getElementById("studentsSection");
const attemptsSection = document.getElementById("attemptsSection");

const studentsEl = document.getElementById("students");
const attemptsEl = document.getElementById("attempts");
const emptyStudents = document.getElementById("emptyStudents");
const emptyAttempts = document.getElementById("emptyAttempts");

const kpiIntents = document.getElementById("kpiIntents");
const kpiMitjana = document.getElementById("kpiMitjana");
const kpiTemps = document.getElementById("kpiTemps");

const backdrop = document.getElementById("backdrop");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

let cache = [];

function fmt(n){
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return String(n);
}
function toLocal(ts){
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function close(){ backdrop.style.display = 'none'; }
closeModal.addEventListener('click', close);
backdrop.addEventListener('click', (ev)=>{ if(ev.target===backdrop) close(); });

logoutBtn.onclick = ()=> signOut(auth).then(()=> window.location='index.html');

viewSel.addEventListener('change', ()=>{
  const v = viewSel.value;
  if (v === 'students') {
    studentsSection.style.display = '';
    attemptsSection.style.display = 'none';
  } else {
    studentsSection.style.display = 'none';
    attemptsSection.style.display = '';
  }
});

refreshBtn.onclick = load;
filterEmail.addEventListener('input', ()=> render());
limitSel.addEventListener('change', load);
activitySel.addEventListener('change', load);

onAuthStateChanged(auth, (user)=>{
  if(!user){ window.location='login.html'; return; }
  who.textContent = `Sessió: ${user.email}`;

  if(user.email !== PROFESSOR_EMAIL){
    alert('Aquest panell és només per al professor.');
    window.location='unitats.html';
    return;
  }

  load();
});

async function load(){
  studentsEl.innerHTML='';
  attemptsEl.innerHTML='';
  emptyStudents.style.display='none';
  emptyAttempts.style.display='none';

  const lim = parseInt(limitSel.value,10) || 50;
  const act = activitySel.value || 'A1';

  const q = query(ref(rtdb, `resultats/${act}`), orderByChild('timestamp'), limitToLast(lim));
  const snap = await get(q);
  const val = snap.val();

  cache = [];
  if (val) {
    cache = Object.entries(val).map(([id, data]) => ({ id, ...data }));
    cache.sort((a,b)=> (b.timestamp||'').localeCompare(a.timestamp||''));
  }

  render();
}

function render(){
  const f = (filterEmail.value||'').trim().toLowerCase();
  const data = f ? cache.filter(x => (x.email||'').toLowerCase().includes(f)) : cache.slice();

  kpiIntents.textContent = fmt(data.length);
  if(data.length===0){
    kpiMitjana.textContent='—';
    kpiTemps.textContent='—';
  } else {
    const avgScore = data.reduce((s,x)=> s + (Number(x.encerts)||0), 0) / data.length;
    const avgTotal = data.reduce((s,x)=> s + (Number(x.total)||0), 0) / data.length;
    const avgTime = data.reduce((s,x)=> s + (Number(x.tempsSegons)||0), 0) / data.length;

    kpiMitjana.textContent = (avgTotal ? `${avgScore.toFixed(1)}/${avgTotal.toFixed(0)}` : `${avgScore.toFixed(1)}`);
    kpiTemps.textContent = (avgTime ? avgTime.toFixed(0) : '—');
  }

  renderStudents(data);
  renderAttempts(data);
}

function renderStudents(data){
  studentsEl.innerHTML='';
  if(data.length===0){ emptyStudents.style.display='block'; return; }

  const map = new Map();
  data.forEach(r=>{
    const key = (r.email || '(sense email)');
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });

  const rows = [];
  for (const [email, arr] of map.entries()) {
    const intents = arr.length;
    const avgScore = arr.reduce((s,x)=> s + (Number(x.encerts)||0), 0) / intents;
    const avgTotal = arr.reduce((s,x)=> s + (Number(x.total)||0), 0) / intents;
    const best = arr.reduce((m,x)=> Math.max(m, Number(x.encerts)||0), 0);
    const avgTime = arr.reduce((s,x)=> s + (Number(x.tempsSegons)||0), 0) / intents;

    rows.push({ email, intents, avgScore, avgTotal, best, avgTime, attempts: arr });
  }
  rows.sort((a,b)=> a.email.localeCompare(b.email));

  rows.forEach(row=>{
    const div = document.createElement('div');
    div.className = 'row cardRow';

    div.innerHTML = `
      <div class='cell' title='${row.email}'>${row.email}</div>
      <div class='cell'><span class='badge'>${row.intents}</span></div>
      <div class='cell'><span class='badge'>${row.avgTotal ? row.avgScore.toFixed(1) + '/' + row.avgTotal.toFixed(0) : row.avgScore.toFixed(1)}</span></div>
      <div class='cell hide-xs'><span class='badge'>${row.best}</span></div>
      <div class='cell hide-sm'><span class='badge'>${row.avgTime ? row.avgTime.toFixed(0) + 's' : '—'}</span></div>
      <div class='cell'><button class='btn-small'>Veure</button></div>
    `;

    div.querySelector('button').addEventListener('click', ()=> openStudentModal(row));
    studentsEl.appendChild(div);
  });
}

function openStudentModal(row){
  modalTitle.textContent = `Detalls — ${row.email}`;
  modalBody.innerHTML = '';

  const p = document.createElement('div');
  p.innerHTML = `
    <p style='margin:0 0 8px;color:#555;'>
      <strong>Intents:</strong> ${row.intents} ·
      <strong>Mitjana:</strong> ${row.avgTotal ? row.avgScore.toFixed(1) + '/' + row.avgTotal.toFixed(0) : row.avgScore.toFixed(1)} ·
      <strong>Millor:</strong> ${row.best}
    </p>
    <hr style='border:none;border-top:1px solid #eee;margin:10px 0 16px;'>
  `;
  modalBody.appendChild(p);

  row.attempts.sort((a,b)=> (b.timestamp||'').localeCompare(a.timestamp||''));
  row.attempts.forEach((r, idx)=>{
    const box = document.createElement('div');
    box.className = 'err';

    const encerts = fmt(r.encerts);
    const total = fmt(r.total);
    const errades = fmt(r.errades);
    const temps = fmt(r.tempsSegons);

    box.innerHTML = `
      <strong>Intent ${idx+1} · ${toLocal(r.timestamp||'')}</strong>
      <div class='meta'>Encerts: <span class='badge'>${encerts}/${total}</span> · Errades: <span class='badge'>${errades}</span> · Temps: <span class='badge'>${temps}s</span></div>
      <div style='margin-top:10px;'><button class='btn-small'>Veure errades</button></div>
    `;

    box.querySelector('button').addEventListener('click', ()=> openErrorsModal(row.email, r));
    modalBody.appendChild(box);
  });

  backdrop.style.display = 'flex';
}

function openErrorsModal(email, r){
  modalTitle.textContent = `Errades — ${email} · ${toLocal(r.timestamp||'')}`;
  modalBody.innerHTML = '';

  const errors = r.errors || [];
  if (errors.length === 0) {
    modalBody.innerHTML = "<p style='color:#666;'>✅ Cap errada. L’estudiant ho ha fet tot bé!</p>";
  } else {
    errors.forEach(e=>{
      const div = document.createElement('div');
      div.className = 'err';
      div.innerHTML = `
        <strong>Pregunta ${fmt(e.pregunta)}</strong>
        <div class='meta'>Resposta usuari: <span class='badge'>${fmt(e.respostaUsuari)}</span></div>
        <div class='meta'>Resposta correcta: <span class='badge'>${fmt(e.respostaCorrecta)}</span></div>
        ${e.tipus ? `<div class='meta'>Tipus: <span class='badge'>${fmt(e.tipus)}</span></div>` : ''}
      `;
      modalBody.appendChild(div);
    });
  }

  backdrop.style.display = 'flex';
}

function renderAttempts(data){
  attemptsEl.innerHTML='';
  if(data.length===0){ emptyAttempts.style.display='block'; return; }

  data.forEach(r=>{
    const card = document.createElement('div');
    card.className='card';

    const encerts = fmt(r.encerts);
    const total = fmt(r.total);
    const errades = fmt(r.errades);
    const temps = fmt(r.tempsSegons);

    card.innerHTML = `
      <div class='attempt'>
        <div class='attempt-left'>
          <div style='font-weight:600;font-size:1.05rem;word-break:break-word;'>${r.email || r.uid || '(sense email)'}</div>
          <div class='meta'>${toLocal(r.timestamp || '')}</div>
          <div style='margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;'>
            <span class='badge'>Encerts: ${encerts}/${total}</span>
            <span class='badge'>Errades: ${errades}</span>
            <span class='badge'>Temps: ${temps}s</span>
          </div>
        </div>
        <div>
          <button class='btn-small'>Veure errades</button>
        </div>
      </div>
    `;

    card.querySelector('button').addEventListener('click', ()=> openErrorsModal(r.email || r.uid || 'Estudiant', r));
    attemptsEl.appendChild(card);
  });
}
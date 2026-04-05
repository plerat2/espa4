import { auth, rtdb } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const PROFE_JS_VERSION = "2026-04-02_students_click_v2";
console.log("✅ PROFE JS carregat:", PROFE_JS_VERSION);

const PROFESSOR_EMAIL = "josepantonipeiro@cepallevant.eu, "ximznr@gmail.com";
const ACTIVITATS = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10"];
const PER_ACT_SCAN = 500;
const PER_ACT_ATTEMPTS = 500;

// Elements comuns
const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

// UI alumnes
const detectedStudents = document.getElementById("detectedStudents");
const detectedEmpty = document.getElementById("detectedEmpty");
const studentDetailWrap = document.getElementById("studentDetailWrap");
const studentDetailTitle = document.getElementById("studentDetailTitle");
const studentActivities = document.getElementById("studentActivities");
const backToStudents = document.getElementById("backToStudents");
const refreshStudents = document.getElementById("refreshStudents");

// UI intents
const studentAttemptsWrap = document.getElementById("studentAttemptsWrap");
const attemptsTitle = document.getElementById("attemptsTitle");
const attemptsEl = document.getElementById("attempts");
const emptyAttempts = document.getElementById("emptyAttempts");
const backToDetail = document.getElementById("backToDetail");

// Modal errades
const backdrop = document.getElementById("backdrop");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

function fmt(n){
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return String(n);
}
function toLocal(ts){
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function close(){ backdrop.style.display = "none"; }
closeModal?.addEventListener("click", close);
backdrop?.addEventListener("click", (ev)=>{ if(ev.target===backdrop) close(); });

logoutBtn.onclick = () => signOut(auth).then(()=> window.location="index.html");
refreshBtn.onclick = () => scanDetectedStudents();
refreshStudents?.addEventListener("click", () => scanDetectedStudents(true));

backToStudents?.addEventListener("click", () => {
  studentDetailWrap.style.display = "none";
  studentAttemptsWrap.style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
});
backToDetail?.addEventListener("click", () => {
  studentAttemptsWrap.style.display = "none";
  studentDetailWrap.style.display = "";
  window.scrollTo({ top: studentDetailWrap.getBoundingClientRect().top + window.scrollY - 10, behavior: "smooth" });
});

let detectedIndex = new Map();

onAuthStateChanged(auth, async (user) => {
  if(!user){ window.location="login.html"; return; }
  who.textContent = `Sessió: ${user.email}`;

  if(user.email !== PROFESSOR_EMAIL){
    alert("Aquest panell és només per al professor.");
    window.location="unitats.html";
    return;
  }

  await scanDetectedStudents();
});

async function scanDetectedStudents(keepSelection=false){
  const currentEmail = keepSelection && studentDetailWrap.style.display !== "none"
    ? (studentDetailTitle.textContent.split("—").slice(-1)[0] || "").trim()
    : "";

  detectedStudents.innerHTML = "<p class='meta' style='text-align:center;'>Carregant alumnes…</p>";
  detectedEmpty.style.display = "none";

  const idx = new Map();

  const perAct = await Promise.all(ACTIVITATS.map(async (act) => {
    const q = query(ref(rtdb, `resultats/${act}`), orderByChild("timestamp"), limitToLast(PER_ACT_SCAN));
    const snap = await get(q);
    if (!snap.exists()) return [];
    return Object.values(snap.val()).map(d => ({...d, act}));
  }));

  const all = perAct.flat();

  all.forEach(r => {
    const email = (r.email || "").trim();
    if (!email) return;

    if (!idx.has(email)) {
      idx.set(email, { email, intentsTotal: 0, acts: new Set(), lastTs: "", perAct: {} });
    }
    const o = idx.get(email);
    o.intentsTotal += 1;
    o.acts.add(r.act);
    if (!o.lastTs || (r.timestamp && r.timestamp > o.lastTs)) o.lastTs = r.timestamp;

    if (!o.perAct[r.act]) o.perAct[r.act] = { count: 0, lastTs: "" };
    o.perAct[r.act].count += 1;
    if (!o.perAct[r.act].lastTs || (r.timestamp && r.timestamp > o.perAct[r.act].lastTs)) o.perAct[r.act].lastTs = r.timestamp;
  });

  detectedIndex = idx;
  renderDetectedStudents();

  if (currentEmail && detectedIndex.has(currentEmail)) {
    openStudentDetail(currentEmail);
  }
}

function renderDetectedStudents(){
  detectedStudents.innerHTML = "";
  const arr = [...detectedIndex.values()].sort((a,b) => (b.lastTs || "").localeCompare(a.lastTs || ""));

  if (arr.length === 0) {
    detectedEmpty.style.display = "block";
    return;
  }
  detectedEmpty.style.display = "none";

  arr.forEach(s => {
    const card = document.createElement("div");
    card.className = "stu-card";
    card.innerHTML = `
      <div class='stu-email' title='${s.email}'>${s.email}</div>
      <div class='stu-meta'>
        <span class='badge'>Activitats: ${s.acts.size}</span>
        <span class='badge'>Intents: ${s.intentsTotal}</span>
        <span class='badge'>Darrer: ${s.lastTs ? toLocal(s.lastTs) : "—"}</span>
      </div>
      <div class='meta' style='margin-top:10px;'>Clica per veure activitats fetes</div>
    `;
    card.addEventListener("click", () => openStudentDetail(s.email));
    detectedStudents.appendChild(card);
  });
}

function openStudentDetail(email){
  const s = detectedIndex.get(email);
  if (!s) return;

  studentAttemptsWrap.style.display = "none";
  studentDetailWrap.style.display = "";
  studentDetailTitle.textContent = `Activitats fetes — ${email}`;
  studentActivities.innerHTML = "";

  const acts = Object.entries(s.perAct)
    .map(([act, v]) => ({ act, ...v }))
    .sort((a,b) => (b.lastTs || "").localeCompare(a.lastTs || ""));

  acts.forEach(a => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.innerHTML = `
      <div class='cell'><span class='badge'>${a.act}</span></div>
      <div class='cell'><span class='badge'>${a.count}</span></div>
      <div class='cell hide-sm2'>${a.lastTs ? toLocal(a.lastTs) : "—"}</div>
      <div class='cell'><button class='btn-small'>Obrir intents</button></div>
    `;
    row.querySelector("button").addEventListener("click", () => showAttemptsForStudent(email, a.act));
    studentActivities.appendChild(row);
  });

  window.scrollTo({ top: studentDetailWrap.getBoundingClientRect().top + window.scrollY - 10, behavior: "smooth" });
}

async function showAttemptsForStudent(email, act){
  studentDetailWrap.style.display = "none";
  studentAttemptsWrap.style.display = "";
  attemptsTitle.textContent = `Intents — ${email} · ${act}`;
  attemptsEl.innerHTML = "<p class='meta' style='text-align:center;'>Carregant intents…</p>";
  emptyAttempts.style.display = "none";

  const q = query(ref(rtdb, `resultats/${act}`), orderByChild("timestamp"), limitToLast(PER_ACT_ATTEMPTS));
  const snap = await get(q);
  if (!snap.exists()) {
    attemptsEl.innerHTML = "";
    emptyAttempts.style.display = "block";
    return;
  }

  const all = Object.entries(snap.val()).map(([id,data]) => ({ id, ...data }));
  const mine = all.filter(r => ((r.email || "").trim().toLowerCase() === email.trim().toLowerCase()));
  mine.sort((a,b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

  attemptsEl.innerHTML = "";
  if (mine.length === 0) {
    emptyAttempts.style.display = "block";
    return;
  }

  mine.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";

    const encerts = fmt(r.encerts);
    const total = fmt(r.total);
    const errades = fmt(r.errades);
    const temps = fmt(r.tempsSegons);

    card.innerHTML = `
      <div class='attempt'>
        <div class='attempt-left'>
          <div style='font-weight:600;font-size:1.05rem;word-break:break-word;'>${email}</div>
          <div class='meta'>${toLocal(r.timestamp || "")}</div>
          <div style='margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;'>
            <span class='badge'>Encerts: ${encerts}/${total}</span>
            <span class='badge'>Errades: ${errades}</span>
            <span class='badge'>Temps: ${temps}s</span>
          </div>
        </div>
        <div><button class='btn-small'>Veure errades</button></div>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => openErrorsModal(email, r));
    attemptsEl.appendChild(card);
  });

  window.scrollTo({ top: studentAttemptsWrap.getBoundingClientRect().top + window.scrollY - 10, behavior: "smooth" });
}

function openErrorsModal(email, r){
  modalTitle.textContent = `Errades — ${email} · ${toLocal(r.timestamp || "")}`;
  modalBody.innerHTML = "";
  const errors = r.errors || [];

  if (!Array.isArray(errors) || errors.length === 0) {
    modalBody.innerHTML = "<p style='color:#666;'>✅ Cap errada. L’estudiant ho ha fet tot bé!</p>";
    backdrop.style.display = "flex";
    return;
  }

  errors.forEach(e => {
    const div = document.createElement("div");
    div.className = "err";
    div.innerHTML = `
      <strong>Pregunta ${fmt(e.pregunta)}</strong>
      <div class='meta'>Resposta usuari: <span class='badge'>${fmt(e.respostaUsuari)}</span></div>
      <div class='meta'>Resposta correcta: <span class='badge'>${fmt(e.respostaCorrecta)}</span></div>
      ${e.tipus ? `<div class='meta'>Tipus: <span class='badge'>${fmt(e.tipus)}</span></div>` : ""}
    `;
    modalBody.appendChild(div);
  });

  backdrop.style.display = "flex";
}

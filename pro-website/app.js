// ====== CONFIG ======
const API_BASE = 'http://localhost:5000/api'; // change to your public URL if needed

// ====== ROUTER ======
const routes = { '/': homePage, '/jobs': jobsPage, '/dashboard': dashboardPage, '/get-started': getStartedPage };
function router(){ const view = location.hash.replace('#','') || '/'; (routes[view]||homePage)().catch?.(console.error); }
addEventListener('hashchange', router);
addEventListener('load', () => { document.getElementById('menuToggle').onclick=()=>document.getElementById('mobileMenu').classList.toggle('hidden'); router(); });

// ====== PAGES ======
async function homePage(){
  document.getElementById('app').innerHTML = `
    <section class="hero">
      <div>
        <h1 class="hero__title">Hire smarter with <span style="color:var(--brand)">AI scoring</span> & adaptive screening.</h1>
        <p class="hero__text">End-to-end recruiting: resume parsing, weighted AI scoring, eligibility gate, and rich recruiter analytics.</p>
        <div class="hero__glass">
          <div class="hero__badges">
            <span class="badge">Weighted Scoring</span><span class="badge">Skill Gap Insights</span><span class="badge">Cert & Degree Boosts</span><span class="badge">KPI Dashboard</span>
          </div>
          <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
            <a href="#/jobs" class="btn">Explore Jobs</a>
            <a href="#/dashboard" class="btn" style="background:linear-gradient(135deg,#00c389,#6bffce)">View Dashboard</a>
          </div>
        </div>
      </div>
      <div class="hero__img"><img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1200&auto=format&fit=crop" alt="product-shot" style="width:100%;height:auto;display:block;"></div>
    </section>
    <section style="margin-top:26px">
      <div class="grid --3">
        <div class="card"><h3>Explainable</h3><p class="meta">Transparent, weighted scoring across skills, experience, education, certs, and JD keywords.</p></div>
        <div class="card"><h3>Fast Screening</h3><p class="meta">Gate candidates by AI threshold; route top talent to assessments instantly.</p></div>
        <div class="card"><h3>Analytics</h3><p class="meta">Eligibility split, score distribution, and recent applications in one place.</p></div>
      </div>
    </section>`;
}

async function jobsPage(){
  const app = document.getElementById('app');
  app.innerHTML = `<h2>Open Roles</h2><div id="jobsList" class="grid" style="margin-top:12px"></div>`;
  const list = document.getElementById('jobsList');
  let jobs = [];
  try{ const r = await fetch(`${API_BASE}/jobs`); jobs = await r.json(); }
  catch{ list.innerHTML = `<div class="card"><h3>Couldn’t load jobs</h3><p class="meta">Is your API running/public?</p></div>`; return; }
  if(!Array.isArray(jobs)||jobs.length===0){ list.innerHTML = `<div class="card"><h3>No jobs yet</h3><p class="meta">Seed server: <code>node scripts/seed-job.js</code></p></div>`; return; }
  for(const j of jobs){
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `
      <h3>${escapeHTML(j.title)}</h3>
      <p class="meta">${escapeHTML(j.description||'')}</p>
      <div class="job-tags">
        <span class="tag">Threshold: ${j.aiScoreThreshold}%</span>
        <span class="tag">Years: ${j.yearsRequired}</span>
        ${(j.requiredSkills||[]).slice(0,6).map(s=>`<span class="tag">${escapeHTML(s.name)} (L${s.minLevel})</span>`).join('')}
      </div>
      <div style="margin-top:12px;display:flex;gap:10px">
        <button class="btn" data-apply="${j._id}" data-title="${escapeHTML(j.title)}">Apply</button>
      </div>`;
    list.appendChild(el);
  }
  list.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-apply]'); if(!b) return;
    openApplyModal({ jobId:b.getAttribute('data-apply'), title:b.getAttribute('data-title') });
  }, { once:true });
}

async function dashboardPage(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <h2>Recruiter Dashboard</h2>
    <div class="kpis">
      <div class="kpi"><div class="meta">Total Applications</div><h2 id="kpiTotal">-</h2></div>
      <div class="kpi"><div class="meta">Eligible</div><h2 id="kpiEligible">-</h2></div>
      <div class="kpi"><div class="meta">Average AI Score</div><h2 id="kpiAvg">-</h2></div>
    </div>
    <div class="grid">
      <div class="card"><h3>Eligibility Split</h3><canvas id="pie"></canvas></div>
      <div class="card"><h3>Score Distribution</h3><canvas id="bar"></canvas></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Recent Applications</h3>
      <div id="appsTable" class="meta" style="margin-top:8px">Loading…</div>
    </div>`;
  let apps = [];
  try{ const r = await fetch(`${API_BASE}/applications`); apps = await r.json(); }
  catch{ document.getElementById('appsTable').innerHTML = `Couldn’t load data. Is the API public?`; return; }
  const total = apps.length; const eligible = apps.filter(a=>a.eligible).length;
  const avg = total ? Math.round(apps.reduce((s,a)=>s+(a.aiScore||0),0)/total) : 0;
  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiEligible').textContent = `${eligible} (${ total ? Math.round(eligible*100/total) : 0 }%)`;
  document.getElementById('kpiAvg').textContent = `${avg}%`;
  const pieCtx = document.getElementById('pie').getContext('2d');
  new Chart(pieCtx,{type:'doughnut',data:{labels:['Eligible','Not Eligible'],datasets:[{data:[eligible,total-eligible],backgroundColor:['#00c389','#6b8bff']}]},options:{plugins:{legend:{labels:{color:'#dfe7ff'}}}}});
  const buckets = {'0-49':0,'50-59':0,'60-69':0,'70-79':0,'80-89':0,'90-100':0};
  for(const a of apps){ const s=a.aiScore||0; if(s<50)buckets['0-49']++; else if(s<60)buckets['50-59']++; else if(s<70)buckets['60-69']++; else if(s<80)buckets['70-79']++; else if(s<90)buckets['80-89']++; else buckets['90-100']++; }
  const barCtx = document.getElementById('bar').getContext('2d');
  new Chart(barCtx,{type:'bar',data:{labels:Object.keys(buckets),datasets:[{label:'Count',data:Object.values(buckets),backgroundColor:'#85f3ff'}]},options:{scales:{x:{ticks:{color:'#b6c3e2'}},y:{ticks:{color:'#b6c3e2'}}},plugins:{legend:{labels:{color:'#dfe7ff'}}}}});
  const tbl = `<div class="grid" style="grid-template-columns:1.2fr 1.4fr 1fr .6fr .8fr;gap:8px">
    <div class="meta">Name</div><div class="meta">Email</div><div class="meta">Job</div><div class="meta">AI</div><div class="meta">Status</div>
    ${apps.map(a=>`<div>${escapeHTML(a.candidate?.name||'-')}</div><div>${escapeHTML(a.candidate?.email||'-')}</div><div>${typeof a.jobId==='object'?escapeHTML(a.jobId?.title||''):a.jobId}</div><div>${a.aiScore ?? '-'}</div><div>${escapeHTML(a.status||'-')}</div>`).join('')}
  </div>`;
  document.getElementById('appsTable').innerHTML = tbl;
}

async function getStartedPage(){
  document.getElementById('app').innerHTML = `
    <div class="card">
      <h3>Get Started</h3>
      <p class="meta">Run your backend on <code>http://localhost:5000</code> (or make it Public in the Ports tab). Then open <strong>Jobs</strong> and <strong>Recruiter Dashboard</strong>.</p>
      <p class="meta">If deployed, edit <code>API_BASE</code> in <code>app.js</code> to your server URL.</p>
    </div>`;
}

// ====== APPLY MODAL ======
function openApplyModal({ jobId, title }){
  const dlg = document.getElementById('applyModal');
  document.getElementById('applyJobTitle').textContent = `Apply — ${title}`;
  const result = document.getElementById('applyResult'); result.classList.add('hidden'); result.classList.remove('ok','warn'); result.textContent='';
  dlg.showModal(); document.getElementById('closeApply').onclick=()=>dlg.close();
  document.getElementById('applyFormBox').onsubmit=(e)=>{e.preventDefault();dlg.close();};
  const submitBtn = document.getElementById('submitApply');
  submitBtn.onclick = async (e)=>{
    e.preventDefault();
    const payload = buildPayload(jobId); if(!payload) return;
    submitBtn.disabled = true; submitBtn.textContent='Scoring…';
    try{
      const r = await fetch(`${API_BASE}/applications`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await r.json();
      result.classList.remove('hidden'); const ok = !!data.eligible; result.classList.add(ok?'ok':'warn');
      result.innerHTML = `<strong>AI Score:</strong> ${data.aiScore}% — <strong>${ok?'Eligible':'Not Eligible'}</strong><br/><span class="meta">Tip: list missing required skills, add certs, and match JD keywords.</span>`;
    }catch{ result.classList.remove('hidden'); result.classList.add('warn'); result.textContent='Failed to submit. Is the API reachable?'; }
    finally{ submitBtn.disabled=false; submitBtn.textContent='Submit & Get AI Score'; }
  };
}
function buildPayload(jobId){
  const name=document.getElementById('candName').value.trim(); const email=document.getElementById('candEmail').value.trim(); const phone=document.getElementById('candPhone').value.trim();
  const raw=document.getElementById('resumeText').value.trim(); const skills=document.getElementById('resumeSkills').value.trim();
  const years=Number(document.getElementById('resumeYears').value||0); const degree=document.getElementById('resumeDegree').value.trim(); const certs=document.getElementById('resumeCerts').value.trim();
  if(!name||!email){ alert('Name and email required'); return null; }
  return { jobId, candidate:{name,email,phone}, resume:{ rawText:raw, skills: skills?skills.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean):[], years, degree, certs: certs?certs.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean):[] } };
}

// ====== HELPERS ======
function escapeHTML(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
addEventListener('click',(e)=>{ const dlg=document.getElementById('applyModal'); if(!dlg.open) return; const box=document.querySelector('.modal__box'); if(e.target===dlg && !box.contains(e.target)) dlg.close(); });

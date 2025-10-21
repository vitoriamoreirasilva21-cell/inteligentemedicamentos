(function(){
  'use strict';
  const $ = sel => document.querySelector(sel);
  const el = (t, cls='', html='') => { const n=document.createElement(t); if(cls) n.className=cls; if(html) n.innerHTML=html; return n; };
  const fmt = iso => new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  const state = { role:'nurse', data:null };

  function makeDemoData(){
    const now = new Date();
    const addH = h => new Date(now.getTime() + h*3600*1000).toISOString();
    const patient = { id:'p_demo', name:'Ana Demo', bed:'Leito 12' };
    const lines = [
      { id:'l1', med:'Metformina', dose:'500 mg', route:'VO' },
      { id:'l2', med:'Losartana', dose:'50 mg', route:'VO' },
    ];
    const schedules = [
      { id:'d1', lineId:'l1', scheduledAt:addH(0.25) },
      { id:'d2', lineId:'l2', scheduledAt:addH(2) },
      { id:'d3', lineId:'l1', scheduledAt:addH(6) },
    ].map(d => ({ ...d,
      medName: `${lines.find(l=>l.id===d.lineId).med} ${lines.find(l=>l.id===d.lineId).dose}`,
      patientName: patient.name, bed: patient.bed, status:'pending'
    }));
    return { patient, lines, schedules };
  }

  function toast(msg){
    const t = el('div','toast',msg); document.body.appendChild(t); setTimeout(()=>t.remove(),2000);
  }

  function setRole(r){ state.role=r; render(); }
  function seed(){ state.data = makeDemoData(); render(); toast('Dados demo carregados.'); }
  function confirmDose(id){
    if(!state.data) return;
    state.data.schedules = state.data.schedules.map(d => d.id===id ? { ...d, status:'done' } : d);
    render(); toast('Dose confirmada.');
  }

  window.__seed = seed;
  window.__setRole = setRole;

  function Chip(active,label,onClick){
    const b = el('button', `chip ${active?'active':''}`); b.textContent = label; b.onclick = onClick; return b;
  }
  function Card(title, actions){
    const wrap = el('div','card');
    const head = el('div','row'); head.style.justifyContent='space-between';
    head.append(el('h3','',title), actions||el('span')); wrap.append(head);
    const body = el('div'); wrap.append(body); return { el: wrap, body };
  }

  function NurseQueue(){
    const card = Card('Fila de administração', el('span','sub','Próximas 20 doses'));
    const list = el('ul','list'); card.body.append(list);
    const queue = [...(state.data?.schedules||[])].sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
    queue.forEach(r=>{
      const li = el('li','item');
      const left = el('div');
      left.append(el('div','',`${r.patientName} — ${r.medName}`),
                 el('div','sub',`${r.bed} · ${fmt(r.scheduledAt)} ${r.status==='done' ? '(confirmada)' : ''}`));
      const right = el('div');
      if(r.status==='pending'){ const btn=el('button','btn','Confirmar'); btn.onclick=()=>confirmDose(r.id); right.append(btn); }
      else { right.append(el('span','pill','Feito')); }
      li.append(left,right); list.append(li);
    });
    return card.el;
  }

  function PatientToday(){
    const card = Card(`Hoje — ${state.data?.patient.name||''}`);
    const list = el('ul','list'); card.body.append(list);
    const items = [...(state.data?.schedules||[])].sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
    items.forEach(d=>{
      const li = el('li','item');
      const left = el('div');
      left.append(el('div','',`${fmt(d.scheduledAt)} · ${d.medName}`), el('div','sub',`Status: ${d.status==='done'?'Tomou':'Pendente'}`));
      const right = el('div');
      if(d.status==='pending'){ const btn=el('button','btn btn-outline','Tomei'); btn.onclick=()=>confirmDose(d.id); right.append(btn); }
      else { right.append(el('span','pill','✔')); }
      li.append(left,right); list.append(li);
    });
    return card.el;
  }

  function FamilyPanel(){
    const card = Card(`Painel Familiar — ${state.data?.patient.name||''}`);
    const items = [...(state.data?.schedules||[])].sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
    const grid = el('div'); card.body.append(grid);
    items.forEach(it=>{
      const box = el('div','card'); box.style.padding='12px'; box.style.borderColor='#e2e8f0';
      const row = el('div','row'); row.style.justifyContent='space-between';
      row.append(el('div','',`${fmt(it.scheduledAt)} · ${it.medName}`), el('span','', it.status==='done' ? 'Tomou':'Pendente'));
      box.append(row); grid.append(box);
    });
    return card.el;
  }

  function renderHeader(){
    const chips = $('#role-chips'); chips.innerHTML='';
    chips.append(Chip(state.role==='patient','Paciente',()=>setRole('patient')),
                 Chip(state.role==='nurse','Enfermeiro(a)',()=>setRole('nurse')),
                 Chip(state.role==='family','Familiar',()=>setRole('family')));
    $('#patient-badge').textContent = state.data ? `Paciente: ${state.data.patient.name} · ${state.data.patient.bed}` : 'Sem dados carregados';
  }
  function renderMain(){
    const root = $('#content'); root.innerHTML='';
    if(state.role==='nurse'){
      const grid = el('div','grid');
      const left = el('div'); left.append(NurseQueue());
      const right = el('div');
      const res = Card('Resumo do Plantão');
      const pend = state.data ? state.data.schedules.filter(d=>d.status==='pending').length : 0;
      const done = state.data ? state.data.schedules.filter(d=>d.status==='done').length : 0;
      res.body.innerHTML = `<div class="item" style="border-top:0"><span>Doses pendentes</span><span>${pend}</span></div>
                            <div class="item"><span>Doses confirmadas</span><span>${done}</span></div>`;
      grid.append(left,res.el); root.append(grid);
    }
    if(state.role==='patient'){
      const grid = el('div','grid');
      const left = el('div'); left.append(PatientToday());
      const right = el('div'); const meds = Card('Medicamentos'); meds.body.innerHTML = `<ul class="sub" style="padding-left:18px"><li>Metformina 500 mg — VO — 12/12h</li><li>Losartana 50 mg — VO — 24/24h</li></ul>`;
      grid.append(left,meds.el); root.append(grid);
    }
    if(state.role==='family'){
      const grid = el('div','grid'); const left = el('div'); left.append(FamilyPanel());
      const right = el('div'); const al = Card('Alertas'); al.body.innerHTML = `<div class="sub">Você receberá avisos se houver dose atrasada ou perdida.</div>`;
      grid.append(left,al.el); root.append(grid);
    }
  }
  function render(){ renderHeader(); renderMain(); }

  document.addEventListener('DOMContentLoaded', ()=>{
    $('#btn-seed').addEventListener('click', seed);
    $('#btn-patient').addEventListener('click', ()=>setRole('patient'));
    render();
  });
})();
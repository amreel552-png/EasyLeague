(() => {
  'use strict';
  let domain, domainFailure = false;
  const filters = new Map();
  let reportType = 'overall', reportTeam = '';
  const local = (bm,en) => L(bm,en);
  const dict = {
    single:['Liga satu pusingan','Single round robin'], double:['Liga dua pusingan','Double round robin'],
    groups:['Peringkat kumpulan','Group stage'], knockout:['Kalah mati','Knockout'], event:['Acara berbilang peserta','Multi-entrant event'],
    registration:['Pendaftaran pertandingan','Competition registration'], teams:['Maklumat pasukan','Team profiles'],
    players:['Senarai pemain','Player roster'], cards:['Kad pemain','Player cards'],
    fixtures:['Jadual perlawanan','Fixtures'], results:['Keputusan pertandingan','Results'], standings:['Kedudukan liga','Standings'],
    assessments:['Pentaksiran prestasi','Performance assessments'], overall:['Laporan keseluruhan','Competition overview']
  };
  const tr = k => dict[k] ? local(...dict[k]) : k;
  const labels = {Disiplin:'Discipline',Kerjasama:'Teamwork','Strategi permainan':'Game strategy',Komunikasi:'Communication','Semangat kesukanan':'Sportsmanship',Kesukanan:'Sportsmanship'};
  const criterion = c => local(c.name,c.nameEn||c.en||labels[c.name]||c.name);
  const el = id => document.getElementById(id);
  const val = id => el(id).value;
  const rows = key => (S[key] || []).filter(r => r.competitionId === active);
  const teamName = id => (S.teams || []).find(t => t.id === id)?.name || local('Belum ditentukan','To be decided');
  const edit = () => ['admin','lecturer'].includes(S.me?.role);
  // JSON literals are encoded for HTML attributes to keep action arguments as data.
  const arg = v => esc(JSON.stringify(v)).replace(/'/g,'&#39;');
  const option = (value,text,chosen) => '<option value="'+esc(value)+'"'+(chosen===value?' selected':'')+'>'+esc(text)+'</option>';
  const button = (label,action,primary=false) => '<button type="button" class="lm-button '+(primary?'lm-primary':'')+'" onclick="'+action+'">'+esc(label)+'</button>';
  const cell = v => esc(String(v ?? '—'));
  const table = (headers,data) => '<div class="lm-scroll"><table class="lm-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+data.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const empty = (title,text,action='') => '<div class="lm-empty"><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+action+'</div>';
  const toolbar = (description,actions='') => '<div class="lm-bar"><p>'+esc(description)+'</p><div>'+actions+'</div></div>';
  const field = (label,html) => '<label class="lm-field"><span>'+esc(label)+'</span>'+html+'</label>';
  const input = (id,type,value='',attrs='') => '<input id="'+id+'" type="'+type+'" value="'+cell(value)+'" '+attrs+'>';
  const submitButton = label => '<div class="lm-footer"><button type="button" class="lm-button" onclick="closeModal()">'+local('Batal','Cancel')+'</button><button class="lm-button lm-primary" type="submit">'+esc(label)+'</button></div>';
  const dateText = d => { if(!d) return '—'; const x = new Date(String(d).length===10?d+'T12:00:00':d); return Number.isNaN(+x) ? d : x.toLocaleDateString(local('ms-MY','en-GB'),{day:'numeric',month:'short',year:'numeric'}); };
  const format = c => tr(c.format);
  const ready = f => f.teamIds.length>1 && f.teamIds.every(Boolean);
  const final = f => Array.isArray(f.scores);
  const pairing = f => f.teamIds.map(teamName).join(f.teamIds.length===2?'  ·  ':' / ');
  const allFixtures = () => rows('fixtures').sort((a,b)=>[a.date||'',a.time||'',a.id].join(' ').localeCompare([b.date||'',b.time||'',b.id].join(' ')));
  const checked = async (form,fn) => {
    const b=form?.querySelector('[type=submit]');
    if(b?.disabled)return;
    if(b)b.disabled=true;
    try {await fn();closeModal();} catch(e){notify(e.message||String(e));}finally{if(b)b.disabled=false;}
  };
  window.leagueStandings = comp => comp && domain ? domain.standings(comp,S.teams,S.fixtures) : [];
  import('/domain.mjs').then(api=>{domain=api;if(typeof render==='function'&&typeof S!=='undefined'&&S?.me)render();}).catch(()=>{domainFailure=true;});
  const standingsRows = () => window.leagueStandings(selected());
  const standingsHeaders = () => [local('Ked.','Rank'),local('Pasukan / peserta','Team / entrant'),local('Main','Played'),local('Menang','Won'),local('Seri','Drawn'),local('Kalah','Lost'),local('Skor','For'),local('Lawan','Against'),local('Beza','Diff.'),local('Mata','Points')];
  const metric = n => typeof n==='number' ? Number(n.toFixed(4)) : n;
  const rankCells = r => [r.rank,r.name,r.played,r.won,r.drawn,r.lost,r.for,r.against,r.difference,r.points].map(metric);
  const setFilter = (key,v) => {filters.set(active+':'+key,v);render();};
  const getFilter = key => filters.get(active+':'+key)||'';
  const choose = (key,label,opts) => field(label,'<select onchange="lm.setFilter(\''+key+'\',this.value)">'+opts.map(([v,t])=>option(v,t,getFilter(key))).join('')+'</select>');
  const teamOptions = () => [['',local('Semua pasukan','All teams')],...rows('teams').map(t=>[t.id,t.name])];
  function fixturesPage(resultView) {
    const games = allFixtures();
    const key=resultView?'results':'fixtures';
    const generate = edit() ? button(games.length?local('Jana semula jadual','Regenerate fixtures'):local('Jana jadual','Generate fixtures'),'lm.generateForm()',true) : '';
    const intro = resultView ? local('Masukkan skor mengikut unit yang digunakan dalam pertandingan.','Record scores using the unit selected for the competition.') : local('Susun pusingan, masa dan tempat setiap perlawanan.','Plan the rounds, times and venues for every fixture.');
    if(!games.length)return toolbar(intro)+empty(local('Jadual belum dijana','No fixtures yet'), rows('teams').length<2?local('Daftarkan sekurang-kurangnya dua pasukan atau peserta dahulu.','Register at least two teams or entrants first.'):local('Jana jadual menggunakan format pertandingan ini.','Generate the schedule using this competition’s format.'),edit()?(rows('teams').length<2?button(local('Urus pasukan','Manage teams'),"go('teams')",true):generate):'');
    const teamFilter=getFilter(key+'Team'),statusFilter=getFilter(key+'Status');
    const visible=games.filter(f=>(!teamFilter||f.teamIds.includes(teamFilter))&&(!statusFilter||((statusFilter==='done')===final(f))));
    const controls=choose(key+'Team',local('Pasukan','Team'),teamOptions())+choose(key+'Status','Status',[['',local('Semua status','All statuses')],['open',local('Belum selesai','Pending')],['done',local('Selesai','Completed')]]);
    return toolbar(intro,resultView?'':(edit()?'<span class="lm-actions">'+button(local('Kosongkan jadual','Clear fixtures'),'lm.clearForm()')+generate+'</span>':''))+'<div class="lm-filters">'+controls+'</div>'+
      (visible.length ? table([local('Pusingan','Round'),local('Perlawanan','Fixture'),local('Tarikh / masa','Date / time'),local('Tempat','Venue'),local('Keputusan','Result'),...(edit()?[local('Tindakan','Action')]:[])],visible.map(f=>{
        const actions=resultView ? (ready(f)?button(final(f)?local('Betulkan','Correct'):local('Masukkan skor','Enter score'),'lm.scoreForm('+arg(f.id)+')'):'—'):button(local('Ubah jadual','Reschedule'),'lm.editForm('+arg(f.id)+')');
        return [cell(f.round)+(f.group?'<small>'+local('Kumpulan','Group')+' '+cell(f.group)+'</small>':''),'<strong>'+cell(pairing(f))+'</strong>'+(f.notes?'<small>'+cell(f.notes)+'</small>':''),cell(dateText(f.date))+'<small>'+cell(f.time)+'</small>',cell(f.location),final(f)?'<b class="lm-score">'+cell(f.scores.join(' : '))+'</b>':'<span class="lm-chip">'+local('Belum selesai','Pending')+'</span>',...(edit()?[actions]:[])];
      })):empty(local('Tiada padanan','No matches found'),local('Pilih pasukan atau status yang lain.','Choose another team or status.')));
  }
  function generateForm() {
    const c=selected(), games=allFixtures(), teams=rows('teams');
    if(teams.length<2)return notify(local('Daftarkan sekurang-kurangnya dua pasukan atau peserta.','Register at least two teams or entrants.'));
    const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    modal(local('Jana jadual perlawanan','Generate fixtures'),'<form onsubmit="event.preventDefault();lm.generate(this)"><p>'+cell(format(c))+' · '+teams.length+' '+local('pasukan / peserta','teams / entrants')+'</p><div class="lm-grid">'+field(local('Tarikh mula','Start date'),input('lm-date','date',c.date||today,'required'))+field(local('Masa mula','Start time'),input('lm-time','time','09:00','required'))+field(local('Tempoh slot (minit)','Slot duration (minutes)'),input('lm-duration','number',60,'required min="1" max="1440"'))+field(local('Lokasi','Venue'),input('lm-location','text',c.location||'','required maxlength="180"'))+(c.format==='groups'?field(local('Bilangan kumpulan','Number of groups'),input('lm-groups','number',Math.min(2,Math.floor(teams.length/2)),'required min="1" max="'+Math.floor(teams.length/2)+'"')):'')+(c.format==='event'?field(local('Bilangan acara / pusingan','Number of events / rounds'),input('lm-rounds','number',1,'required min="1" max="100"')):'')+'</div>'+(games.length?'<label class="lm-check"><input type="checkbox" required>'+local('Saya bersetuju untuk menggantikan semua jadual dan keputusan dalam pertandingan ini.','I agree to replace all fixtures and results in this competition.')+'</label>':'')+submitButton(local('Jana jadual','Generate fixtures'))+'</form>');
  }
  function clearForm() {
    modal(local('Kosongkan jadual pertandingan?','Clear competition fixtures?'),'<form onsubmit="event.preventDefault();lm.clearFixtures(this)"><p>'+local('Semua perlawanan dan keputusan bagi pertandingan ini akan dipadam. Pasukan dan pemain akan dikekalkan.','All fixtures and results for this competition will be deleted. Teams and players will be retained.')+'</p>'+submitButton(local('Padam jadual dan keputusan','Delete fixtures and results'))+'</form>');
  }
  function clearFixtures(form){return checked(form,()=>save('clearFixtures',{competitionId:active}));}
  function generate(form) {
    const options={date:val('lm-date'),time:val('lm-time'),duration:Number(val('lm-duration')),location:val('lm-location').trim()};
    if(el('lm-groups'))options.groups=Number(val('lm-groups'));if(el('lm-rounds'))options.rounds=Number(val('lm-rounds'));
    return checked(form,()=>save('generate',{competitionId:active,options}));
  }
  const fixtureById = id => rows('fixtures').find(f=>f.id===id);
  function editForm(id) {
    const f=fixtureById(id);if(!f)return;
    modal(local('Ubah jadual','Reschedule fixture'),'<form onsubmit="event.preventDefault();lm.editFixture(this,'+arg(id)+')"><p>'+cell(pairing(f))+'</p><div class="lm-grid">'+field(local('Tarikh','Date'),input('lm-date','date',f.date,'required'))+field(local('Masa','Time'),input('lm-time','time',f.time,'required'))+field(local('Tempoh slot (minit)','Slot duration (minutes)'),input('lm-duration','number',f.duration||60,'required min="1" max="1440"'))+field(local('Lokasi','Venue'),input('lm-location','text',f.location,'required maxlength="180"'))+'</div>'+submitButton(local('Simpan jadual','Save fixture'))+'</form>');
  }
  function editFixture(form,id) {const f=fixtureById(id);return checked(form,()=>save('save',{collection:'fixtures',record:{...f,date:val('lm-date'),time:val('lm-time'),duration:Number(val('lm-duration')),location:val('lm-location').trim()}}));}
  function scoreForm(id) {
    const f=fixtureById(id);if(!f||!ready(f))return;
    const c=selected(), overridden=Array.isArray(f.awardedPoints),history=(S.logs||[]).filter(l=>l.recordId===id&&l.action==='result');
    const scoreUnit=c.scoreUnit||c.unit||local('Skor','Score');
    modal(local('Keputusan perlawanan','Fixture result'),'<form onsubmit="event.preventDefault();lm.record(this,'+arg(id)+')"><p>'+cell(dateText(f.date))+' · '+cell(f.time)+' · '+cell(f.location)+'</p><div class="lm-grid">'+f.teamIds.map((t,i)=>field(teamName(t)+' · '+scoreUnit,input('lm-score-'+i,'number',f.scores?.[i]??'','required step="any"'))).join('')+'</div><label class="lm-check"><input type="checkbox" id="lm-override" onchange="lm.override(this.checked)" '+(overridden?'checked':'')+'>'+local('Tetapkan mata liga khas','Override awarded league points')+'</label><div id="lm-points" class="lm-grid" '+(!overridden?'hidden':'')+'>'+f.teamIds.map((t,i)=>field(teamName(t)+' · '+local('Mata liga','League points'),input('lm-points-'+i,'number',f.awardedPoints?.[i]??'',overridden?'required step="any"':'disabled step="any"'))).join('')+'</div>'+field(local('Catatan pensyarah','Lecturer notes'),'<textarea id="lm-notes" maxlength="2000">'+cell(f.notes||'')+'</textarea>')+(final(f)&&c.format==='knockout'?'<label class="lm-check"><input type="checkbox" required>'+local('Jika pemenang berubah, keputusan pusingan berikutnya yang terjejas akan dikosongkan.','Changing the winner clears affected results in later rounds.')+'</label>':'')+(history.length?'<details><summary>'+local('Sejarah keputusan','Result history')+'</summary>'+history.map(l=>'<p>'+cell(dateText(l.at))+' · '+cell(l.actor)+' · '+cell((Array.isArray(l.before)?l.before:l.before?.scores||[]).join(' : ')||'—')+' → '+cell((Array.isArray(l.after)?l.after:l.after?.scores||[]).join(' : ')||'—')+'</p>').join('')+'</details>':'')+submitButton(local('Simpan keputusan','Save result'))+'</form>');
  }
  function override(enabled){const box=el('lm-points');box.hidden=!enabled;box.querySelectorAll('input').forEach(i=>{i.disabled=!enabled;i.required=enabled;});}
  function record(form,id){const f=fixtureById(id);return checked(form,()=>save('result',{competitionId:active,id,scores:f.teamIds.map((_,i)=>Number(val('lm-score-'+i))),awardedPoints:el('lm-override').checked?f.teamIds.map((_,i)=>Number(val('lm-points-'+i))):null,notes:val('lm-notes').trim()}));}
  function standingsPage() {
    const c=selected(), list=standingsRows(), games=allFixtures(), completed=games.some(final), finished=games.length>0&&games.every(final);
    if(!list.length)return empty(local('Belum ada peserta','No entrants yet'),local('Kedudukan akan dipaparkan selepas pendaftaran pasukan.','Standings appear after teams are registered.'));
    const groups=[...new Set(list.map(r=>r.group))];
    const text=c.format==='event'?local('Mata dikira mengikut kedudukan peserta bagi setiap acara.','Points are awarded by finishing position in each event.'):c.format==='knockout'?local('Kedudukan dikira mengikut kemajuan peserta dalam pusingan kalah mati.','Entrants are ranked by their progress in the knockout rounds.'):local('Kedudukan dikemas kini selepas setiap keputusan disimpan.','Rankings update each time a result is saved.');
    return toolbar(text)+groups.map(g=>(g?'<h3>'+local('Kumpulan','Group')+' '+cell(g)+'</h3>':'')+table(standingsHeaders(),list.filter(r=>r.group===g).map(r=>{
      const entries=rankCells(r).map(cell);
      entries[0]=completed?'<b class="lm-rank lm-rank-'+Math.min(4,r.rank)+'">'+cell(r.rank)+'</b>':'—';entries[1]='<strong>'+cell(r.name)+'</strong>';
      if(finished&&r.rank<=3)entries[1]+='<small>'+[local('Juara','Champion'),local('Naib juara','Runner-up'),local('Tempat ketiga','Third place')][r.rank-1]+'</small>';entries[entries.length-1]='<b>'+cell(r.points)+'</b>';return entries;
    }))).join('');
  }
  const criteria = () => selected()?.criteria?.length ? selected().criteria : domain.DEFAULT_CRITERIA;
  const savedAssessment = teamId => rows('assessments').find(a=>a.teamId===teamId);
  function assessmentPage() {
    if(!edit())return empty(local('Akses terhad','Restricted access'),local('Pentaksiran diuruskan oleh pensyarah.','Assessments are managed by lecturers.'));
    const teams=rows('teams');
    if(!teams.length)return empty(local('Belum ada pasukan untuk dinilai','No teams to assess'),local('Daftarkan pasukan sebelum memulakan pentaksiran.','Register a team before starting assessments.'),button(local('Urus pasukan','Manage teams'),"go('teams')"));
    return toolbar(local('Nilai prestasi pasukan mengikut rubrik pertandingan. Setiap pembetulan disimpan dalam sejarah pentaksiran.','Assess each team against the competition rubric. Corrections are kept in the assessment history.'))+table([local('Pasukan','Team'),local('Markah','Score'),local('Pencapaian','Achievement'),local('Kemas kini','Updated'),local('Tindakan','Action')],teams.map(t=>{
      const a=savedAssessment(t.id);
      return ['<strong>'+cell(t.name)+'</strong>',a?cell(a.total)+' / '+cell(a.maximum):'—',a?cell(metric(a.percentage))+'%':'—',a?cell(dateText(a.updatedAt)):'—',button(a?local('Semak pentaksiran','Review assessment'):local('Nilai pasukan','Assess team'),'lm.assessForm('+arg(t.id)+')')];
    }));
  }
  function assessForm(teamId) {
    const record=savedAssessment(teamId),rubric=criteria();
    const defaultMark=c=>record?.marks?.[(record.criteria||[]).findIndex(old=>old.name===c.name&&Number(old.max)===Number(c.max))]??'';
    const snapshot=a=>'<section><strong>'+cell(dateText(a.updatedAt))+' · '+cell(a.total)+' / '+cell(a.maximum)+' ('+cell(metric(a.percentage))+'%)</strong><p>'+cell(a.actor||'')+'</p><dl>'+a.criteria.map((c,i)=>'<div><dt>'+cell(criterion(c))+'</dt><dd>'+cell(a.marks[i])+' / '+cell(c.max)+'</dd></div>').join('')+'</dl><p>'+cell(a.notes||'')+'</p></section>';
    modal(local('Pentaksiran pasukan','Team assessment'),'<form oninput="lm.sum()" onsubmit="event.preventDefault();lm.saveAssessment(this,'+arg(teamId)+')"><h3>'+cell(teamName(teamId))+'</h3><div class="lm-grid">'+rubric.map((c,i)=>field(criterion(c)+' / '+c.max,input('lm-mark-'+i,'number',defaultMark(c),'required min="0" max="'+cell(c.max)+'" step="any"'))).join('')+'</div><p id="lm-total" class="lm-total" aria-live="polite"></p>'+field(local('Ulasan pensyarah','Lecturer comments'),'<textarea id="lm-notes" maxlength="2000">'+cell(record?.notes||'')+'</textarea>')+(record?'<details class="lm-history"><summary>'+local('Rekod pentaksiran','Assessment history')+'</summary>'+[record,...(record.history||[]).slice().reverse()].map(snapshot).join('')+'</details>':'')+submitButton(local('Simpan pentaksiran','Save assessment'))+'</form>');
    sum();
  }
  function sum(){const rubric=criteria(),total=rubric.reduce((n,_,i)=>n+(Number(val('lm-mark-'+i))||0),0),maximum=rubric.reduce((s,c)=>s+Number(c.max),0);el('lm-total').textContent=local('Jumlah','Total')+'  '+metric(total)+' / '+maximum+'  ·  '+metric(total*100/maximum)+'%';}
  function saveAssessment(form,teamId){const a=savedAssessment(teamId);return checked(form,()=>save('save',{collection:'assessments',record:{id:a?.id,competitionId:active,teamId,marks:criteria().map((_,i)=>Number(val('lm-mark-'+i))),notes:val('lm-notes').trim()}}));}
  const yes = n=>n?local('Ya','Yes'):local('Tidak','No');
  const statuses={planned:['Dirancang','Planned'],active:['Aktif','Active'],completed:['Selesai','Completed'],pending:['Menunggu','Pending'],registered:['Berdaftar','Registered'],withdrawn:['Menarik diri','Withdrawn']};
  const statusLabel=v=>statuses[v]?local(...statuses[v]):(v||'—');
  const reportKeys=()=>['registration','teams','players','cards','fixtures','results','standings',...(edit()?['assessments']:[])];
  function reportSection(key) {
    const comp=selected(),teamRows=rows('teams').filter(t=>!reportTeam||t.id===reportTeam),players=rows('players').filter(p=>!reportTeam||p.teamId===reportTeam),games=allFixtures().filter(f=>!reportTeam||f.teamIds.includes(reportTeam));
    const category=local('Kategori','Category'),unit=comp.unit||local('Skor','Score'),team=local('Pasukan','Team');
    let head,body;
    switch(key){
    case 'registration':
      head=[local('Butiran','Field'),local('Maklumat','Value')];body=[[local('Pertandingan','Competition'),comp.name],[local('Sukan','Sport'),comp.sport],[category,comp.category],['Format',format(comp)],[local('Tarikh','Date'),dateText(comp.date)],[local('Lokasi','Venue'),comp.location],[local('Pensyarah','Lecturer'),comp.lecturer],['Status',statusLabel(comp.status)],[local('Jumlah pasukan','Teams registered'),rows('teams').length],[local('Unit skor','Score unit'),unit]];break;
    case 'teams':
      head=[team,local('Kod','Code'),local('Fakulti','Faculty'),local('Ketua','Captain'),local('Pengurus','Manager'),local('Pemain','Players')];body=teamRows.map(t=>[t.name,t.code,t.faculty,t.captain,t.manager,players.filter(p=>p.teamId===t.id).length]);break;
    case 'players':
      head=[local('Pemain','Player'),local('Matrik','Registration ID'),team,local('Jersi','Jersey'),local('Posisi','Position'),'Status',local('Layak','Eligible')];body=players.map(p=>[p.name,p.matric,teamName(p.teamId),p.jersey,p.position,statusLabel(p.status),yes(p.eligible)]);break;
    case 'cards':
      head=[local('Kod pemain','Player ID'),local('Pemain','Player'),team,local('Jersi','Jersey'),local('Pengesahan','Verified')];body=players.filter(p=>p.verified).map(p=>[p.id,p.name,teamName(p.teamId),p.jersey,yes(p.verified)]);break;
    case 'fixtures':case 'results':
      head=[local('Pusingan','Round'),local('Kumpulan','Group'),local('Perlawanan','Fixture'),local('Tarikh','Date'),local('Masa','Time'),local('Tempat','Venue'),...(key==='results'?[unit,local('Mata khas','Award override'),local('Catatan','Notes')]:['Status'])];body=games.filter(f=>key!=='results'||final(f)).map(f=>[f.round,f.group,pairing(f),dateText(f.date),f.time,f.location,...(key==='results'?[f.scores.join(' : '),f.awardedPoints?.join(' : ')||'—',f.notes]:[final(f)?local('Selesai','Completed'):local('Dijadualkan','Scheduled')])]);break;
    case 'standings':
      head=[local('Kumpulan','Group'),...standingsHeaders()];body=standingsRows().filter(r=>!reportTeam||r.teamId===reportTeam).map(r=>[r.group,...rankCells(r)]);break;
    case 'assessments':
      head=[team,local('Kriteria','Criterion'),local('Markah','Score'),local('Maksimum','Maximum'),local('Pencapaian pasukan (%)','Team achievement (%)'),local('Ulasan','Comments'),local('Tarikh','Date')];body=rows('assessments').filter(a=>!reportTeam||a.teamId===reportTeam).flatMap(a=>a.criteria.map((c,i)=>[teamName(a.teamId),criterion(c),a.marks[i],c.max,metric(a.percentage),a.notes,dateText(a.updatedAt)]));break;
    }
    return {title:tr(key),head,body};
  }
  function reportData(){if(!rows('teams').some(t=>t.id===reportTeam))reportTeam='';const available=reportKeys();if(reportType!=='overall'&&!available.includes(reportType))reportType='overall';return (reportType==='overall'?available:[reportType]).map(reportSection);}
  const reportBrand=()=>'<div class="lm-paper-head"><div><b class="lm-brand">easyleague</b><p>'+esc(tr(reportType))+'</p></div><span>'+cell(dateText(new Date().toISOString()))+'</span></div>';
  function reportHTML(sections){
    return '<article class="lm-paper">'+reportBrand()+'<h2>'+cell(selected().name)+'</h2><p>'+[selected().sport,selected().location,reportTeam?teamName(reportTeam):null].filter(Boolean).map(cell).join(' · ')+'</p>'+sections.map(s=>'<section><h3>'+cell(s.title)+'</h3>'+(s.body.length?table(s.head,s.body.map(r=>r.map(cell))):'<p>'+local('Tiada rekod.','No records.')+'</p>')+'</section>').join('')+'</article>';
  }
  function reportPage(){
    const data=reportData(), options=['overall',...reportKeys()];
    return toolbar(local('Pilih kandungan dan pasukan untuk menyediakan laporan pertandingan.','Choose the report content and team to prepare a competition report.'))+'<div class="lm-filters">'+field(local('Jenis laporan','Report type'),'<select onchange="lm.reportSelect(this.value)">'+options.map(k=>option(k,tr(k),reportType)).join('')+'</select>')+field(local('Pasukan','Team'),'<select onchange="lm.reportSelectTeam(this.value)">'+teamOptions().map(([v,t])=>option(v,t,reportTeam)).join('')+'</select>')+'</div><div class="lm-exports">'+button(local('Cetak / Simpan PDF','Print / Save PDF'),"lm.exportReport('pdf')",true)+button('Excel (.xlsx)',"lm.exportReport('xlsx')")+button('CSV',"lm.exportReport('csv')")+(reportType==='cards'?button(local('Cetak kad digital','Print digital cards'),'rosterPrintCards('+arg(reportTeam||null)+')'):'')+'</div>'+reportHTML(data);
  }
  function printReport(html){
    const frame=document.createElement('iframe');frame.title=local('Cetakan laporan','Report printout');frame.style.cssText='position:fixed;width:1px;height:1px;inset:auto 0 0;opacity:0;border:0;pointer-events:none';
    frame.onload=()=>{const w=frame.contentWindow;w.addEventListener('afterprint',()=>setTimeout(()=>frame.remove(),200),{once:true});w.focus();w.print();};
    frame.srcdoc='<!doctype html><html><head><meta charset="utf-8"><title>'+cell(selected().name)+' — '+cell(tr(reportType))+'</title><style>@page{margin:14mm;size:A4 landscape}body{font:12px Arial,sans-serif;color:#142c24}h2{font-size:24px}h3{margin-top:24px;break-after:avoid}table{width:100%;border-collapse:collapse;text-align:left}th,td{border-bottom:1px solid #cbd5d0;padding:6px;overflow-wrap:anywhere}th{background:#e8f3eb}tr{break-inside:avoid}.lm-paper-head{display:flex;justify-content:space-between;border-bottom:2px solid #20573b;padding:8px 0}.lm-brand{font-size:24px;color:#155538}.lm-paper-head p{margin:6px 0}</style></head><body>'+html+'</body></html>';
    document.body.append(frame);
  }
  async function exportReport(kind){
    try{const data=reportData();if(kind==='pdf')return printReport(reportHTML(data));
      const fileName=(selected().name+'-'+tr(reportType)).replace(/[^\p{L}\p{N} ._-]/gu,'-'),out=[];
      for(const s of data)out.push([],[s.title],s.head,...s.body);
      const headers=['easyleague',selected().name,tr(reportType),dateText(new Date().toISOString())];
      if(kind==='xlsx')await rosterWorkbook(fileName,headers,out);else rosterCSV(fileName,headers,out);
    }catch(e){notify(e.message||String(e));}
  }
  window.lm={clearForm,clearFixtures,setFilter,generateForm,generate,editForm,editFixture,scoreForm,record,override,assessForm,saveAssessment,sum,exportReport,reportSelect:v=>{reportType=v;render();},reportSelectTeam:v=>{reportTeam=v;render();}};
  window.matchPage = page => {
    if(!selected())return empty(local('Pilih pertandingan','Select a competition'),local('Wujudkan atau pilih pertandingan untuk membuka modul ini.','Create or select a competition to open this module.'),button(local('Lihat pertandingan','View competitions'),"go('competitions')"));
    if(!domain)return '<p role="status">'+(domainFailure?local('Modul gagal dimuatkan. Muat semula halaman.','Could not load the module. Reload the page.'):local('Memuatkan…','Loading…'))+'</p>';
    return ({fixtures:()=>fixturesPage(false),results:()=>fixturesPage(true),standings:standingsPage,assessments:assessmentPage,reports:reportPage}[page]||(()=>''))();
  };
})();

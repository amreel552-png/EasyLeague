'use strict';
var S=null, active='', page='dashboard', lang=localStorage.getItem('el-lang')==='en'?'en':'ms', failure=null;
const L=(bm,en)=>lang==='en'?en:bm;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
 competitions:'<path d="M8 3h8v5c0 4-2 6-4 6S8 12 8 8zM8 5H4v2a4 4 0 004 4m8-6h4v2a4 4 0 01-4 4m-4 3v5m-4 2h8"/>',
 teams:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0112 0v2m0-15a3 3 0 010 6m3 3a5 5 0 013 5"/>',
 players:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a7 7 0 0114 0v2z"/>',
 cards:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4.5 16c1-4 6-4 7 0m3-6h4m-4 4h4"/>',
 fixtures:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m3 0h2"/>',
 results:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zm0 12 2 2 4-5"/>',
 standings:'<path d="M3 21V11h6v10m0-18h6v18m0-13h6v13M2 21h20"/>',
 assessments:'<path d="m3 17 5-5 4 3 8-10m-5 0h5v5M3 21h18"/>',
 reports:'<path d="M5 3h10l4 4v14H5zM14 3v5h5m-11 5h7m-7 4h7"/>',
 activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="10" cy="18" r="2" fill="white"/>',
 accounts:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0112 0v2m4-14v6m-3-3h6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',next:'<path d="m9 6 6 6-6 6"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 logout:'<path d="M9 4H4v16h5m4-13 5 5-5 5m-5-5h10"/>',layers:'<path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',flag:'<path d="M4 21V4q4-3 8 0t8 0v9q-4 3-8 0t-8 0"/>'};
function icon(k){return '<svg aria-hidden="true" class="ico" viewBox="0 0 24 24">'+(paths[k]||paths.layers)+'</svg>'}
function logo(){return '<div class="brand"><svg viewBox="0 0 42 42" aria-hidden="true"><rect width="42" height="42" rx="12" fill="#11613e"/><path fill="#c6ed9f" d="M12 10h21l-4 6H8zm-5 9h21l-4 6H3zm6 9h10l-4 6H9z"/></svg>easyleague</div>'}
const names={dashboard:['Papan pemuka','Dashboard'],competitions:['Pertandingan','Competitions'],teams:['Pasukan','Teams'],players:['Pemain','Players'],cards:['Kad pemain','Player cards'],fixtures:['Jadual perlawanan','Fixtures'],results:['Keputusan','Results'],standings:['Kedudukan liga','Standings'],assessments:['Pentaksiran','Assessments'],reports:['Laporan','Reports'],accounts:['Pengguna','Users'],settings:['Tetapan','Settings'],activity:['Aktiviti','Activity']};
function label(k){return L(...names[k])}
function selected(){return S?.competitions.find(c=>c.id===active)}
function chooseCompetition(id){active=id;sessionStorage.setItem('el-comp',id);render()}
function cleanPage(){return location.hash.slice(1).split('?')[0]||'dashboard'}
function go(id){document.body.classList.remove('openrail');if(location.hash==='#'+id){page=id;render()}else location.hash=id}
window.addEventListener('hashchange',()=>{page=cleanPage();render();window.scrollTo(0,0)});
function toggleLang(code){lang=code;localStorage.setItem('el-lang',code);render()}
function modal(title,html){dt.textContent=title;dc.innerHTML=html;if(!dlg.open)dlg.showModal()}
function closeModal(){dlg.close()}
dismiss.onclick=closeModal;
let toastTimer;
function notify(msg){clearTimeout(toastTimer);toast.textContent=msg;toast.style.display='block';toastTimer=setTimeout(()=>toast.style.display='none',3800)}
function sync(data){S=data;if(!selected())active=S.competitions.find(c=>c.id===sessionStorage.getItem('el-comp'))?.id||S.competitions[0]?.id||''}
async function save(action,payload={}){const res=await apiFetch('/api/mutate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,action,revision:S.revision})});const data=await res.json();if(!res.ok){if(res.status===409)await refresh();throw new Error(data.error||L('Gagal menyimpan','Unable to save'))}sync(data);render();notify(L('Perubahan disimpan','Changes saved'));return data}
async function refresh(){try{const r=await apiFetch('/api/state');const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error),{status:r.status});failure=null;sync(data)}catch(e){failure=e}render()}
const editable=()=>S?.me.role!=='representative';
function navitem(p){return '<button class="navitem '+(page===p?'on':'')+'" onclick="go(\''+p+'\')" '+(page===p?'aria-current="page"':'')+'>'+icon(p)+label(p)+'</button>'}
function group(name,items){return '<div class="navgroup">'+name+'</div>'+items.map(navitem).join('')}
function language(){return '<div class="lang">'+['ms','en'].map((v,i)=>'<button class="'+(v===lang?'chosen':'')+'" onclick="toggleLang(\''+v+'\')">'+['BM','EN'][i]+'</button>').join('')+'</div>'}
function actionRow(p,bm,en){return '<button class="quick" onclick="dashAction(\''+p+'\')">'+icon(p)+L(bm,en)+'<span class="end">'+icon('next')+'</span></button>'}
function dashAction(p){if(p==='competitions'){go(p);rosterForm(p);return}if(!active){notify(L('Cipta pertandingan untuk bermula.','Create a competition to get started.'));go('competitions');return}go(p);if(['teams','players'].includes(p))rosterForm(p)}
const catalog=[['football','Bola sepak','Football','Gol','Goals'],['badminton','Badminton','Badminton','Set','Sets'],['basketball','Bola keranjang','Basketball','Mata','Points'],['volleyball','Bola tampar','Volleyball','Set','Sets'],['netball','Bola jaring','Netball','Gol','Goals'],['football','Futsal','Futsal','Gol','Goals'],['other','Sukan tersuai','Custom sport','Skor tersuai','Custom score']];
function sportStart(i){const s=catalog[i];closeModal();go('competitions');rosterForm('competitions');const f=dc.querySelector('form');if(f){f.elements.sport.value=i===6?'':L(s[1],s[2]);f.elements.unit.value=i===6?'':L(s[3],s[4]);f.elements.allowDraw.checked=![1,2,3].includes(i);if(i===6)f.elements.sport.focus()}}
function sportCard(s,i){return '<button class="sportcard" onclick="sportStart('+i+')"><span class="sportpic"><svg width="30" height="30" aria-hidden="true"><use href="/sports.svg#'+s[0]+'"/></svg></span><span><strong>'+L(s[1],s[2])+'</strong><small>'+L(s[3],s[4])+'</small></span></button>'}
function catalogModal(){modal(L('Pilih jenis sukan','Select a sport'),'<div class="sportgrid catalogue">'+catalog.map(sportCard).join('')+'</div>')}
function metric(p,n,bm,en){return '<button class="metric" onclick="go(\''+p+'\')"><span class="tileico">'+icon(p)+'</span><span><b>'+n+'</b><small>'+L(bm,en)+'</small></span></button>'}
function row(text,meta){return '<div class="plainrow"><strong>'+esc(text)+'</strong><div class="subtle">'+esc(meta)+'</div></div>'}
function panel(title,inside,p){return '<section class="panel"><div class="paneltop"><h2>'+title+'</h2>'+(p?'<button class="quiet" onclick="go(\''+p+'\')">'+L('Lihat semua','View all')+'</button>':'')+'</div>'+inside+'</section>'}
function dashboard(){
 const matches=S.fixtures.filter(f=>!active||f.competitionId===active),planned=matches.filter(f=>!Array.isArray(f.scores)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),done=matches.filter(f=>Array.isArray(f.scores)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 const pairing=f=>f.teamIds.map(id=>S.teams.find(t=>t.id===id)?.name||L('Belum ditentukan','To be decided')).join(' · ');
 const schedule=planned.length?planned.slice(0,3).map(f=>row(pairing(f),[f.date,f.time,f.location].filter(Boolean).join(' · '))).join(''):'<div class="fixture-empty">'+icon('fixtures')+'<strong>'+L('Belum ada perlawanan dijadualkan','No upcoming fixtures')+'</strong><p>'+L('Jadual akan dipaparkan selepas perlawanan dijana.','Fixtures will appear here once generated.')+'</p></div>';
 const quick=editable()?actionRow('teams','Daftar pasukan','Register a team')+actionRow('players','Tambah pemain','Add a player')+actionRow('fixtures','Jana jadual perlawanan','Generate fixtures'):actionRow('cards','Lihat kad pemain','View player cards')+actionRow('fixtures','Semak jadual','View fixtures')+actionRow('standings','Semak kedudukan','View standings');
 const ranks=window.leagueStandings?.(selected())||[];
 return '<section class="hero"><img class="hero-art" src="/hero.svg" alt=""><div class="herotext"><div class="tagline">'+icon('flag')+L('Pengurusan liga sukan','Sports league management')+'</div><h1>'+label('dashboard')+'</h1><p>Smart League Management, Made Easy.</p><button onclick="'+(editable()?"dashAction('competitions')":"go('fixtures')")+'">'+icon(editable()?'plus':'fixtures')+(editable()?L('Cipta pertandingan','Create competition'):label('fixtures'))+'</button></div></section><div class="headrow"><h2>'+L('Ringkasan liga','League overview')+'</h2><span class="subtle">'+L('Semua pertandingan','All competitions')+'</span></div><div class="stats">'+metric('competitions',S.competitions.length,'Pertandingan','Competitions')+metric('teams',S.teams.length,'Pasukan berdaftar','Registered teams')+metric('players',S.players.length,'Pemain berdaftar','Registered players')+metric('fixtures',S.fixtures.length,'Perlawanan','Fixtures')+'</div><div class="grid2">'+panel(L('Perlawanan terdekat','Upcoming fixtures'),schedule,'fixtures')+panel(L('Tindakan pantas','Quick actions'),quick)+'</div>'+(editable()?'<div class="headrow"><h2>'+L('Mulakan liga mengikut sukan','Start a league by sport')+'</h2><button class="quiet" onclick="catalogModal()">'+L('Semua sukan','All sports')+'</button></div><div class="sportgrid">'+catalog.slice(0,4).map(sportCard).join('')+'</div>':'')+'<div class="grid2">'+panel(label('standings'),ranks.slice(0,3).map(r=>row(r.rank+'. '+r.name,r.points+' '+L('mata','points'))).join('')||'<p class="subtle">'+L('Kedudukan akan tersedia selepas peserta didaftarkan.','Standings appear after entrants are registered.')+'</p>','standings')+panel(L('Keputusan terkini','Recent results'),done.slice(0,3).map(f=>row(pairing(f),f.scores.join(' – '))).join('')||'<p class="subtle">'+L('Belum ada keputusan direkodkan.','No results recorded yet.')+'</p>','results')+'</div><div class="grid2">'+panel(L('Kemajuan pertandingan','Competition progress'),row(done.length+' '+L('selesai','completed'),planned.length+' '+L('belum berlangsung','remaining'))+(editable()?row(new Set(S.assessments.filter(a=>a.competitionId===active).map(a=>a.teamId)).size+' '+L('pasukan dinilai','teams assessed'),selected()?.name||'') :''))+(editable()?panel(L('Aktiviti terkini','Recent activity'),S.logs.slice(0,3).map(log=>row([log.actor,log.name||(names[log.collection]?label(log.collection):log.action)].filter(Boolean).join(' · '),new Date(log.at).toLocaleString(L('ms-MY','en-GB')))).join('')||'<p class="subtle">'+L('Belum ada aktiviti direkodkan.','No activity recorded yet.')+'</p>','activity'):'')+'</div>';
}
function render(){
 document.documentElement.lang=lang;
 if(new URLSearchParams(location.search).has('card'))return;
 const app=document.getElementById('app');
 if(!S||failure){app.innerHTML='<section class="panel login">'+logo()+(failure?'<h2>'+L('Akses ruang kerja','Workspace access')+'</h2><p>'+esc(failure.message)+'</p>'+loginFields()+'':'<p>'+L('Memuatkan ruang kerja…','Loading workspace…')+'</p>')+'</section>';return}
 const me=S.me,manage=editable(),admin=me.role==='admin',roleName=admin?L('Pentadbir','Administrator'):manage?L('Pensyarah','Lecturer'):L('Wakil pasukan','Team representative');
 if(!names[page]||(!admin&&page==='accounts')||(!manage&&['reports','assessments','activity'].includes(page)))page='dashboard';
 const rail=logo()+navitem('dashboard')+group(L('Pengurusan','Management'),['competitions','teams','players','cards'])+group(L('Liga & prestasi','League & performance'),['fixtures','results','standings',...(manage?['assessments','reports']:[])])+group(L('Sistem','System'),[...(admin?['accounts']:[]),'settings'])+'<div class="profile"><span class="avatar">'+esc((me.name||'EL').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase())+'</span><span><strong>'+esc(me.name)+'</strong><small>'+roleName+'</small></span><a title="'+L('Log keluar','Sign out')+'" target="_top" href="#" onclick="event.preventDefault();leagueLogout()">'+icon('logout')+'</a></div>';
 const bar='<header class="bar"><div class="crumb"><button class="iconbtn menu" aria-label="Menu" onclick="document.body.classList.add(\'openrail\')">'+icon('menu')+'</button><span>'+L('Ruang kerja','Workspace')+'</span><span> / </span><b>'+label(page)+'</b></div><div class="bar-right">'+(S.competitions.length?'<select aria-label="'+label('competitions')+'" onchange="chooseCompetition(this.value)">'+S.competitions.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===active?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select>':'')+language()+'</div></header>';
 let body=page==='dashboard'?dashboard():['competitions','teams','players','cards'].includes(page)?rosterPage(page):['settings','activity','accounts'].includes(page)?adminPage(page):matchPage(page);
 app.innerHTML='<div class="mobileveil" onclick="document.body.classList.remove(\'openrail\')"></div><aside class="rail">'+rail+'</aside><main class="main">'+bar+'<div class="content">'+(page!=='dashboard'?'<div class="pagehead"><h1>'+label(page)+'</h1></div>':'')+body+'</div></main>';
}
page=cleanPage();if(new URLSearchParams(location.search).has('card'))rosterVerifyCard();else{render();refresh()}

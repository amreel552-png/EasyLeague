// @ts-nocheck
import postgres from "npm:postgres@3.4.5";
// Shared by the browser and the Worker. Dates and times are competition-local.
export const DEFAULT_CRITERIA = [
  ['Disiplin','Discipline'], ['Kerjasama','Teamwork'], ['Strategi permainan','Strategy'],
  ['Komunikasi','Communication'], ['Semangat kesukanan','Sportsmanship']
].map(([name,en]) => ({name,en,max:20}));

const problem = (ms,en) => { throw new Error(ms+' / '+en); };
const requiredNumber = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value));
const numeric = (value,fallback) => requiredNumber(value) ? Number(value) : fallback;
const direction = comp => comp.direction === 'lower' ? -1 : 1;
const sum = arr => arr.reduce((a,b) => a+b,0);
const rounded = n => Math.round((n+Number.EPSILON)*1e8)/1e8;
const completed = f => Array.isArray(f.scores) && f.scores.length === f.teamIds.length && f.scores.every(requiredNumber);
function integer(value,min,max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) problem('Nilai di luar julat','Value outside the permitted range');
  return n;
}
function instant(date,time) {
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) problem('Tarikh atau masa tidak sah','Invalid date or time');
  const dateTime = new Date(date+'T'+time+':00Z');
  if (!Number.isFinite(+dateTime) || dateTime.toISOString().slice(0,10) !== date) problem('Tarikh tidak sah','Invalid date');
  return +dateTime;
}
export function validateSchedule(fixtures,f) {
  const start = instant(f.date,f.time);
  const end = start+integer(f.duration ?? 60,1,1440)*60000;
  const venue = String(f.location || '').trim().toLocaleLowerCase();
  for (const other of fixtures) {
    if (other.id === f.id || !other.date || !other.time) continue;
    const at = instant(other.date,other.time);
    if (at >= end || at+(other.duration ?? 60)*60000 <= start) continue;
    const sharesVenue = venue && String(other.location || '').trim().toLocaleLowerCase() === venue;
    if (sharesVenue || f.teamIds.some(id => id && other.teamIds.includes(id))) problem('Masa, peserta atau lokasi bertindih','Schedule conflict for venue or entrant');
  }
  return true;
}
function pairs(ids) {
  const ring=[...ids];
  if (ring.length%2) ring.push(null);
  const rounds=[];
  for(let r=1;r<ring.length;r++){
    const round=[];
    for(let i=0;i<ring.length/2;i++){
      const a=ring[i], b=ring[ring.length-1-i];
      if(a && b) round.push((r+i)%2 ? [a,b] : [b,a]);
    }
    rounds.push(round);
    ring.splice(1,0,ring.pop());
  }
  return rounds;
}
export function generateFixtures(comp,teams,options={}) {
  const ids=teams.filter(t => !t.competitionId || t.competitionId===comp.id).map(t=>t.id);
  if(ids.length<2 || ids.some(id=>!id) || new Set(ids).size!==ids.length) problem('Daftar sekurang-kurangnya dua peserta yang berbeza','Register at least two distinct entrants');
  const date=options.date || comp.date || new Date().toISOString().slice(0,10);
  const start=instant(date,options.time || '09:00');
  const duration=integer(options.duration ?? 60,1,1440);
  const fixtures=[];
  function add(teamIds,round,group='',sources=[]) {
    const at=new Date(start+fixtures.length*duration*60000).toISOString();
    const f={id:crypto.randomUUID(),competitionId:comp.id,round,group,teamIds,sources,scores:null,notes:'',
      date:at.slice(0,10),time:at.slice(11,16),location:options.location ?? comp.location ?? '',duration};
    fixtures.push(f);
    return f;
  }
  switch(comp.format || 'single') {
    case 'knockout': {
      // Seed each first-round pair with one entrant before assigning the remainder.
      const size=2**Math.ceil(Math.log2(ids.length));
      let slots=Array.from({length:size/2},(_,i)=> {
        const second=ids[i+size/2];
        return second ? {source:add([ids[i],second],1).id} : {team:ids[i]};
      });
      for(let round=2;slots.length>1;round++) {
        const next=[];
        for(let k=0;k<slots.length;k+=2) {
          const pair=slots.slice(k,k+2);
          next.push({source:add(pair.map(s=>s.team || null),round,'',pair.map(s=>s.source || null)).id});
        }
        slots=next;
      }
      break;
    }
    case 'event': {
      const rounds=integer(options.rounds ?? comp.rounds ?? 1,1,366);
      for(let r=1;r<=rounds;r++) add([...ids],r);
      break;
    }
    case 'groups': case 'double': case 'single': {
      const count=comp.format==='groups' ? integer(options.groups ?? comp.groups ?? Math.min(2,Math.floor(ids.length/2)),1,Math.floor(ids.length/2)) : 1;
      const groups=Array.from({length:count},()=>[]);
      ids.forEach((id,i)=>groups[i%count].push(id));
      const schedules=groups.map(group=>{
        const first=pairs(group);
        return comp.format==='double' ? [...first,...first.map(round=>round.map(([a,b])=>[b,a]))] : first;
      });
      const max=Math.max(...schedules.map(s=>s.length));
      for(let r=0;r<max;r++) schedules.forEach((schedule,g)=>{
        for(const pair of schedule[r] || []) add(pair,r+1,comp.format==='groups' ? String(g+1) : '');
      });
      break;
    }
    default: problem('Format pertandingan tidak dikenali','Unknown competition format');
  }
  return fixtures;
}
function order(comp,scores) {
  return scores.map((score,i)=>({score:Number(score),i})).sort((a,b)=>(b.score-a.score)*direction(comp));
}
export function recordResult(comp,fixtures,fixtureId,scores,notes='',awardedPoints=null) {
  const found=fixtures.find(f=>f.id===fixtureId && f.competitionId===comp.id);
  if(!found || found.teamIds.some(id=>!id)) problem('Peserta perlawanan belum ditetapkan','Entrants have not been determined');
  if(!Array.isArray(scores) || scores.length!==found.teamIds.length || !scores.every(requiredNumber)) problem('Masukkan skor sah untuk setiap peserta','Enter a valid score for every entrant');
  const values=scores.map(Number);
  if((comp.format==='knockout' || (comp.allowDraw===false && comp.format!=='event')) && values[0]===values[1]) problem('Keputusan memerlukan pemenang','A winner is required');
  if(awardedPoints!=null && (!Array.isArray(awardedPoints) || awardedPoints.length!==values.length || !awardedPoints.every(requiredNumber))) problem('Mata liga tidak sah','Invalid league points');
  const result=fixtures.map(f=>f.id===fixtureId ? {...f,scores:values,notes:String(notes),awardedPoints:awardedPoints?.map(Number) ?? null} : {...f});
  if(comp.format==='knockout') {
    const byId=new Map(result.map(f=>[f.id,f]));
    for(const f of result.filter(f=>f.competitionId===comp.id).sort((a,b)=>a.round-b.round)){
      if(!f.sources?.some(Boolean)) continue;
      const teamIds=f.sources.map((source,i)=>{
        if(!source) return f.teamIds[i];
        const prev=byId.get(source);
        return prev && completed(prev) ? prev.teamIds[order(comp,prev.scores)[0].i] : null;
      });
      if(teamIds.some((id,i)=>id!==f.teamIds[i])) Object.assign(f,{teamIds,scores:null,awardedPoints:null,notes:''});
    }
  }
  return result;
}
function placementPoints(comp) {
  const raw=comp.placePoints;
  const points=typeof raw==='string' ? raw.split(',') : raw;
  return Array.isArray(points) && points.length && points.every(requiredNumber) ? points.map(Number) : [10,6,4,2,1];
}
function awards(comp,f) {
  if(Array.isArray(f.awardedPoints) && f.awardedPoints.length===f.scores.length) return f.awardedPoints.map(Number);
  if(comp.format!=='event'){
    const outcome=Math.sign((f.scores[0]-f.scores[1])*direction(comp));
    const w=numeric(comp.win,3), d=numeric(comp.draw,1), l=numeric(comp.loss,0);
    return outcome>0 ? [w,l] : outcome<0 ? [l,w] : [d,d];
  }
  const scale=placementPoints(comp);
  const ranked=order(comp,f.scores);
  const out=Array(ranked.length).fill(0);
  for(let i=0;i<ranked.length;){
    let j=i+1;
    while(j<ranked.length && ranked[j].score===ranked[i].score) j++;
    let points=0;
    for(let k=i;k<j;k++) points+=scale[k] ?? 0;
    for(let k=i;k<j;k++) out[ranked[k].i]=points/(j-i);
    i=j;
  }
  return out;
}
export function standings(comp,teams,fixtures) {
  const rows=new Map(teams.filter(t=>!t.competitionId || t.competitionId===comp.id).map(t=>[t.id,{
    rank:0,teamId:t.id,name:t.name,group:'',played:0,won:0,drawn:0,lost:0,for:0,against:0,difference:0,points:0
  }]));
  const played=[];
  const knockoutTier=new Map();
  for(const f of fixtures.filter(f=>f.competitionId===comp.id)){
    for(const id of f.teamIds) if(rows.has(id) && f.group) rows.get(id).group=f.group;
    if(!completed(f) || !f.teamIds.every(id=>rows.has(id))) continue;
    played.push(f);
    const pts=awards(comp,f),best=order(comp,f.scores)[0].score;
    f.teamIds.forEach((id,i)=>{
      const r=rows.get(id),score=Number(f.scores[i]);
      const shared=f.scores.filter(x=>Number(x)===best).length>1;
      const winner=score===best && !shared;
      r.played++;
      r.for+=score;
      if(comp.format!=='event') r.against+=Number(f.scores[1-i]);
      if(winner) r.won++;
      else if(score===best) r.drawn++;
      else r.lost++;
      if(comp.format==='knockout') knockoutTier.set(id,Math.max(knockoutTier.get(id) ?? 0,Number(f.round)*2+(winner?1:0)));
      r.points+=pts[i];
      r.difference=rounded(r.for-r.against);
    });
  }
  const base=r=>comp.format==='event' ? [rounded(r.points),r.won] :
    [comp.format==='knockout' ? knockoutTier.get(r.teamId) ?? 0 : 0,rounded(r.points),r.difference*direction(comp),r.for*direction(comp)];
  const grouped=new Map();
  for(const r of rows.values()){
    const key=JSON.stringify([r.group,...base(r)]);
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push(r);
  }
  const mini=new Map();
  for(const tied of grouped.values()){
    if(tied.length<2 || comp.format==='event') continue;
    const ids=new Set(tied.map(r=>r.teamId));
    for(const f of played.filter(f=>f.teamIds.every(id=>ids.has(id)))) {
      const a=awards(comp,f);
      f.teamIds.forEach((id,i)=>mini.set(id,(mini.get(id) || 0)+a[i]));
    }
  }
  const key=r=>[...base(r),mini.get(r.teamId) || 0];
  const compare=(a,b)=>{
    const ak=key(a),bk=key(b);
    for(let i=0;i<ak.length;i++) if(ak[i]!==bk[i]) return bk[i]-ak[i];
    return 0;
  };
  const sorted=[...rows.values()].sort((a,b)=>a.group.localeCompare(b.group,undefined,{numeric:true}) || compare(a,b) || String(a.name).localeCompare(String(b.name)));
  let position=0;
  sorted.forEach((r,i)=>{
    const prev=sorted[i-1];
    position=prev?.group===r.group ? position+1 : 1;
    r.rank=prev && prev.group===r.group && compare(prev,r)===0 ? prev.rank : position;
    r.points=rounded(r.points);
    r.for=rounded(r.for);
    r.against=rounded(r.against);
  });
  return sorted;
}
export function assess(criteria,marks) {
  if(!Array.isArray(criteria) || !criteria.length || !Array.isArray(marks) || criteria.length!==marks.length) problem('Lengkapkan semua kriteria','Complete every criterion');
  if(criteria.some((c,i)=>!requiredNumber(c.max) || Number(c.max)<=0 || !requiredNumber(marks[i]) || Number(marks[i])<0 || Number(marks[i])>Number(c.max))) problem('Markah di luar julat kriteria','Mark outside criterion range');
  const total=rounded(sum(marks.map(Number))),maximum=rounded(sum(criteria.map(c=>Number(c.max))));
  return {total,maximum,percentage:rounded(total*100/maximum)};
}


const tables=['competitions','teams','players','fixtures','assessments'];
const criteriaNames=['Disiplin','Kerjasama','Strategi permainan','Komunikasi','Semangat kesukanan'];
const initialCriteria=()=>criteriaNames.map(name=>({name,max:20}));
const uuid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
function fail(bm,en,status=400){throw Object.assign(new Error(bm+' / '+en),{status});}
function check(test,bm='Maklumat tidak sah',en='Invalid record',status=400){if(!test)fail(bm,en,status);}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});}
const get=(records,id)=>records.find(r=>r.id===id);
const textVal=(s,max=180)=>typeof s==='string' && s.trim().length>0 && s.length<=max;
const key=s=>String(s||'').trim().normalize('NFKC').toLowerCase();
const publicUser=({authId,...rest})=>rest;

async function member(db,request){
 const authId=request.headers.get('oai-authenticated-user-id');
 const email=key(request.headers.get('oai-authenticated-user-email'));
 check(authId,'Sila log masuk','Please sign in',401);
 let who=await db.prepare('SELECT id,email,role,name,teamid AS "teamId",authid AS "authId" FROM users WHERE authId=?').bind(authId).first();
 if(who)return who;
 check(email,'E-mel akaun diperlukan','Account email required',403);
 let name=request.headers.get('oai-authenticated-user-full-name')||email.split('@')[0];
 if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){
   try{name=decodeURIComponent(name);}catch{}
 }
 // A verified identity may claim only a membership preassigned to its email.
 await db.batch([
   db.prepare('UPDATE users SET authId=? WHERE email=? AND authId IS NULL').bind(authId,email)
 ]);
 who=await db.prepare('SELECT id,email,role,name,teamid AS "teamId",authid AS "authId" FROM users WHERE authId=?').bind(authId).first();
 check(who,'Akses belum diberikan. Hubungi pentadbir.','Access has not been granted. Contact the administrator.',403);
 return who;
}
async function readState(db){
 await db.prepare("INSERT INTO league_meta VALUES(1,0,'{}') ON CONFLICT DO NOTHING").run();
 const out=await db.batch([
   ...tables.map(t=>db.prepare('SELECT data FROM '+t)),
   db.prepare('SELECT data FROM logs ORDER BY seq DESC'),db.prepare('SELECT id,email,role,name,teamid AS "teamId",authid AS "authId" FROM users'),db.prepare('SELECT * FROM league_meta WHERE singleton=1')
 ]);
 const state={};[...tables,'logs'].forEach((t,i)=>state[t]=out[i].results.map(r=>JSON.parse(r.data)));
 state.users=out[6].results;
 state.revision=out[7].results[0].revision;
 state.settings=JSON.parse(out[7].results[0].settings);
 return state;
}
function project(s,me){
 const admin=me.role==='admin';
 const rep=me.role==='representative';
 const team=get(s.teams,me.teamId);
 const comps=s.competitions.filter(c=>admin || (rep?c.id===team?.competitionId:c.ownerId===me.id));
 const ids=new Set(comps.map(c=>c.id));
 const same=r=>ids.has(r.competitionId);
 return {...s,competitions:comps,teams:s.teams.filter(same).map(t=>rep&&t.id!==me.teamId?{id:t.id,competitionId:t.competitionId,name:t.name,code:t.code,logo:t.logo}:t),
   players:s.players.filter(p=>same(p)&&(!rep||p.teamId===me.teamId)).map(p=>rep?Object.fromEntries(Object.entries(p).filter(([k])=>!['contact','gender','year','program'].includes(k))):p),
   assessments:rep?[]:s.assessments.filter(same),fixtures:s.fixtures.filter(same).map(f=>rep?{...f,notes:''}:f),
   users:admin?s.users.map(publicUser):[],logs:admin?s.logs:rep?[]:s.logs.filter(same),me:publicUser(me)};
}
function owned(s,me,id){
 const c=get(s.competitions,id);
 check(c && (me.role==='admin'||c.ownerId===me.id),'Pertandingan tidak dapat diakses','Competition unavailable',403);
 return c;
}
function validMedia(value){
 return !value || (typeof value==='string' && value.length<650000 && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value));
}
function validateFields(r){
 check(r && typeof r==='object'&&!Array.isArray(r));
 for(const [k,v] of Object.entries(r)){
   if(k==='logo'||k==='photo')check(validMedia(v),'Format atau saiz gambar tidak sah','Invalid image type or size');
   else if(typeof v==='string')check(v.length<=3500,'Teks terlalu panjang','Text exceeds length limit');
 }
}
function criteriaCheck(list){
 check(Array.isArray(list)&&list.length>0&&list.length<=30&&list.every(c=>textVal(c.name)&&Number.isFinite(Number(c.max))&&Number(c.max)>0&&Number(c.max)<=10000));
 check(new Set(list.map(c=>key(c.name))).size===list.length);
 return list.map(c=>({name:c.name.trim(),nameEn:String(c.nameEn||c.en||"").slice(0,180),max:Number(c.max)}));
}
const pick=(o,keys)=>Object.fromEntries(keys.split(' ').filter(k=>Object.hasOwn(o,k)).map(k=>[k,o[k]]));
function dataRow(s,me,t,input){
 validateFields(input);
 const id=input.id||uuid();
 check(textVal(id,150));
 const prev=get(s[t],id);
 let r={...prev,...input,id};
 if(t==='competitions'){
   if(prev)owned(s,me,id);
   r={...pick(r,'id name sport category date location format direction win draw loss lecturer status unit groupCount rounds startTime duration rest allowDraw participants participantType scoreUnit entrantType placementPoints eventPoints placePoints groups'),ownerId:prev?.ownerId||me.id,criteria:prev?.criteria||initialCriteria()};
   check(textVal(r.name)&&textVal(r.sport)&&['single','double','groups','knockout','event'].includes(r.format));
   check(['lower','higher'].includes(r.direction));
   for(const k of ['win','draw','loss']){r[k]=Number(r[k]??({win:3,draw:1,loss:0}[k]));check(Number.isFinite(r[k])&&Math.abs(r[k])<=10000);}
   if(r.placePoints!==undefined)check(Array.isArray(r.placePoints)&&r.placePoints.length<=1000&&r.placePoints.every(n=>Number.isFinite(n)&&n>=0),'Mata kedudukan tidak sah','Invalid placement points');
   if(prev && s.fixtures.some(f=>f.competitionId===id))check(prev.format===r.format,'Padam jadual dahulu untuk menukar format','Clear fixtures before changing format');
 }else{
   const comp=owned(s,me,r.competitionId);
   check(!prev||prev.competitionId===r.competitionId);
   if(t==='teams'){
     r=pick(r,'id competitionId name code logo faculty captain phone manager category');
     check(textVal(r.name)&&textVal(r.code,60),'Nama dan kod pasukan diperlukan','Team name and code are required');
     check(!s.teams.some(x=>x.id!==id&&x.competitionId===r.competitionId&&(key(x.name)===key(r.name)||key(x.code)===key(r.code))),'Nama atau kod pasukan sudah digunakan','Team name or code already exists');
   }
   if(t==='players'||t==='assessments'){
     check(get(s.teams,r.teamId)?.competitionId===r.competitionId,'Pilih pasukan yang sah','Choose a valid team');
   }
   if(t==='players'){
     r=pick(r,'id competitionId teamId name matric photo gender faculty program year jersey position category status eligible verified contact');
     check(textVal(r.name)&&textVal(r.matric,100),'Nama dan nombor pendaftaran diperlukan','Name and registration number are required');
     r.verified=r.verified===true;
     check(!s.players.some(x=>x.id!==id&&x.competitionId===r.competitionId&&key(x.matric)===key(r.matric)),'Pemain sudah didaftarkan dalam pertandingan ini','Player is already registered in this competition');
   }
   if(t==='fixtures'){
     check(prev,'Jana jadual terlebih dahulu','Generate fixtures first');
     r={...prev,...pick(r,'date time location duration notes')};
     validateSchedule(s.fixtures,r);
   }
   if(t==='assessments'){
     const prior=prev || s.assessments.find(a=>a.competitionId===comp.id&&a.teamId===r.teamId);
     if(prev)check(r.teamId===prev.teamId);
     const criteria=comp.criteria||initialCriteria();
     const marks=r.marks;
     const totals=assess(criteria,marks);
     const history=prior?[...(prior.history||[]),pick(prior,'updatedAt marks criteria notes total percentage maximum actor')]:[];
     r={id:prior?.id||id,competitionId:comp.id,teamId:r.teamId,marks,criteria,notes:String(r.notes||''),...totals,history,updatedAt:now(),actor:me.name};
   }
 }
 return r;
}
function dataSQL(db,t,r){
 const fields=t==='competitions'?['id']:t==='players'||t==='assessments'?['id','competitionId','teamId']:['id','competitionId'];
 const cols=[...fields,'data'];
 return db.prepare('INSERT INTO '+t+'('+cols.join(',')+') VALUES('+cols.map(()=>'?').join(',')+') ON CONFLICT(id) DO UPDATE SET '+cols.slice(1).map(k=>k+'=excluded.'+k).join(',')).bind(...fields.map(k=>r[k]),JSON.stringify(r));
}
function addRow(state,t,row){
 const i=state[t].findIndex(r=>r.id===row.id);
 if(i===-1)state[t].push(row);else state[t][i]=row;
}
function audit(db,me,action,t,id,competitionId,name,before=null,after=null){
 const r={id:uuid(),at:now(),actor:me.name,actorId:me.id,action,collection:t,recordId:id,competitionId,name,before,after};
 return db.prepare('INSERT INTO logs(id,data) VALUES(?,?)').bind(r.id,JSON.stringify(r));
}

function adminOnly(me){check(me.role==='admin','Kebenaran pentadbir diperlukan','Administrator access required',403);}
function checkBackup(b){
 check(b?.version===1 && b.data && !Array.isArray(b.data),'Sandaran tidak sah','Invalid backup');
 const d=b.data;
 for(const t of [...tables,'logs']){
   check(Array.isArray(d[t]) && new Set(d[t].map(r=>r.id)).size===d[t].length);
   for(const r of d[t])check(r && textVal(r.id,150));
 }
 for(const t of ['teams','players','assessments','fixtures'])for(const r of d[t])check(get(d.competitions,r.competitionId));
 for(const t of ['players','assessments'])for(const r of d[t])check(get(d.teams,r.teamId)?.competitionId===r.competitionId);
 for(const r of d.fixtures)check(Array.isArray(r.teamIds)&&r.teamIds.every(id=>!id || get(d.teams,id)?.competitionId===r.competitionId));
 return d;
}
async function mutate(db,s,me,m){
 check(me.role!=='representative','Akses bacaan sahaja','Read-only access',403);
 check(m.revision===s.revision,'Data telah berubah. Muat semula halaman.','The data has changed. Refresh the page.',409);
 const ops=[db.prepare('UPDATE league_meta SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE singleton=1').bind(s.revision)];
 const write=(t,r)=>{ops.push(dataSQL(db,t,r));addRow(s,t,r);};
 const log=(a,t,id,c,name,before,after)=>ops.push(audit(db,me,a,t,id,c,name,before,after));
 const {action,collection:t}=m;
 if(action==='settings'){
   adminOnly(me);const institution=String(m.settings?.institution||'').trim();check(institution.length<=180);
   ops.push(db.prepare('UPDATE league_meta SET settings=? WHERE singleton=1').bind(JSON.stringify({institution})));
   log(action,'settings',null,null,institution);
 }else if(action==='restore'){
   adminOnly(me);const data=checkBackup(m.backup);
   for(const t of ['assessments','players','fixtures','teams','competitions','logs'])ops.push(db.prepare('DELETE FROM '+t));
   for(const t of tables)for(const r of data[t])ops.push(dataSQL(db,t,r));
   for(const r of data.logs)ops.push(db.prepare('INSERT INTO logs(id,data) VALUES(?,?)').bind(r.id,JSON.stringify(r)));
   ops.push(db.prepare('UPDATE league_meta SET settings=? WHERE singleton=1').bind(JSON.stringify(pick(data.settings||{},'institution'))));
   log(action,'backup',null,null,me.name);
 }else if(t==='users'){
   adminOnly(me);
   if(action==='save'){
     const input=m.record||{}, id=input.id||uuid(), email=key(input.email), role=input.role;
     check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254,'Alamat e-mel tidak sah','Invalid email address');
     check(['admin','lecturer','representative'].includes(role));
     const prev=get(s.users,id);
     check(!s.users.some(u=>u.id!==id&&key(u.email)===email),'Akaun sudah wujud','Account already exists');
     if(prev?.authId)check(prev.email===email,'E-mel akaun aktif tidak boleh diubah','A linked account email cannot be changed');
     check(id!==me.id||role==='admin','Kekalkan peranan pentadbir sendiri','Retain your own administrator role');
     const teamId=role==='representative'?input.teamId:null;
     if(role==='representative')check(get(s.teams,teamId),'Pilih pasukan','Select a team');
     const name=String(input.name||email).trim();check(textVal(name));
     ops.push(db.prepare('INSERT INTO users(id,email,role,name,teamId) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,role=excluded.role,name=excluded.name,teamId=excluded.teamId').bind(id,email,role,name,teamId));
     log(action,t,id,null,name,prev?.role,role);
   }else{
     check(action==='delete'&&m.id!==me.id&&get(s.users,m.id),'Akaun tidak boleh dipadam','Cannot delete this account');
     ops.push(db.prepare('DELETE FROM users WHERE id=?').bind(m.id));
     log(action,t,m.id,null,get(s.users,m.id).name);
   }
 }else if(action==='criteria'){
   adminOnly(me);const c=owned(s,me,m.competitionId);const r={...c,criteria:criteriaCheck(m.criteria)};
   write('competitions',r);log(action,'competitions',c.id,c.id,c.name,c.criteria,r.criteria);
 }else if(action==='generate'){
   const c=owned(s,me,m.competitionId);
   const generated=generateFixtures(c,s.teams,m.options||{});
   const other=s.fixtures.filter(f=>f.competitionId!==c.id);
   for(const f of generated)validateSchedule(other,f);
   ops.push(db.prepare('DELETE FROM fixtures WHERE competitionId=?').bind(c.id));
   for(const f of generated)ops.push(dataSQL(db,'fixtures',f));
   log(action,'fixtures',null,c.id,c.name,s.fixtures.filter(f=>f.competitionId===c.id).length,generated.length);
 }else if(action==='result'){
   const c=owned(s,me,m.competitionId);
   const original=get(s.fixtures,m.id);
   check(original?.competitionId===c.id);
   check(String(m.notes||'').length<=3500);
   const updated=recordResult(c,s.fixtures,m.id,m.scores,m.notes||'',m.awardedPoints??null);
   for(const r of updated)if(JSON.stringify(r)!==JSON.stringify(get(s.fixtures,r.id)))write('fixtures',r);
   const after=get(updated,m.id);
   log(action,'fixtures',m.id,c.id,c.name,pick(original,'scores notes awardedPoints'),pick(after,'scores notes awardedPoints'));
 }else if(action==='save'||action==='batch'){
   check(tables.includes(t));
   const records=action==='save'?[m.record]:m.records;
   check(Array.isArray(records)&&records.length>0&&records.length<=300,'Maksimum 300 rekod sekali import','Import up to 300 records at a time');
   for(const rec of records){
     const r=dataRow(s,me,t,rec);
     write(t,r);log(action,t,r.id,t==='competitions'?r.id:r.competitionId,r.name||get(s.teams,r.teamId)?.name||r.id);
   }
 }else if(action==='delete'){
   check(tables.includes(t));const r=get(s[t],m.id);
   check(r,'Rekod tidak ditemui','Record not found',404);const c=owned(s,me,t==='competitions'?r.id:r.competitionId);
   if(t==='teams'&&s.fixtures.some(f=>f.teamIds.includes(r.id))){
     check(false,'Padam jadual pertandingan sebelum mengeluarkan peserta','Clear the competition fixtures before removing an entrant');
   }
   if(t==='fixtures')check(c.format!=='knockout','Jana semula jadual kalah mati','Regenerate the knockout bracket');
   ops.push(db.prepare('DELETE FROM '+t+' WHERE id=?').bind(r.id));
   log(action,t,r.id,c.id,r.name||r.id);
 }else if(action==='clearFixtures'){
   const c=owned(s,me,m.competitionId);
   ops.push(db.prepare('DELETE FROM fixtures WHERE competitionId=?').bind(c.id));
   log(action,'fixtures',null,c.id,c.name);
 }else fail('Tindakan tidak dikenali','Unknown action');
 try{await db.batch(ops);}catch(e){
   if(e.code==='40001' || (e.code==='23502' && e.column_name==='revision'))fail('Data telah berubah. Muat semula halaman.','The data has changed. Refresh the page.',409);
   throw e;
 }
}
async function verifiedCard(db,id){
 const row=await db.prepare('SELECT p.data AS player,t.data AS team,c.data AS comp FROM players p JOIN teams t ON t.id=p.teamId JOIN competitions c ON c.id=p.competitionId WHERE p.id=?').bind(id).first();
 check(row,'Kad tidak ditemui','Card not found',404);
 const p=JSON.parse(row.player), t=JSON.parse(row.team),c=JSON.parse(row.comp);
 check(p.verified,'Kad belum disahkan','Card is not verified',404);
 return {...pick(p,'id name photo jersey position verified status'),teamName:t.name,teamLogo:t.logo||'',sport:c.sport,competitionName:c.name};
}
export async function handleApi(request,env){
 try{
   const db=env.DB,url=new URL(request.url),path=url.pathname;
   check(db,'Pangkalan data belum tersedia','Database unavailable',503);
   if(request.method==='GET'&&path.startsWith('/api/card/'))return json(await verifiedCard(db,decodeURIComponent(path.slice(10))));
   const signed=await member(db,request);
   const state=await readState(db);
   const me=get(state.users,signed.id);
   check(me,'Akses ditarik balik','Access revoked',403);
   if(request.method==='GET'&&path==='/api/state')return json(project(state,me));
   if(request.method==='GET'&&path==='/api/backup'){
     adminOnly(me);const {users,revision,...data}=state;
     return json({version:1,createdAt:now(),data},200,{'content-disposition':'attachment; filename=easyleague-backup.json'});
   }
   if(request.method==='POST'&&path==='/api/mutate'){
     const origin=request.headers.get('origin');
     check(!origin||origin===url.origin,'Permintaan tidak sah','Invalid origin',403);
     check(request.headers.get('content-type')?.includes('application/json'),'Format JSON diperlukan','JSON format required',415);
     const m=await request.json();check(m&&typeof m==='object');
     await mutate(db,state,me,m);
     const next=await readState(db);
     return json(project(next,get(next.users,me.id)));
   }
   return json({error:'Laluan tidak ditemui / Route not found'},404);
 }catch(e){
   if(e.status)return json({error:e.message},e.status);
   if(e instanceof SyntaxError || (e instanceof Error && e.message.includes(' / ') && !e.message.includes('D1')))return json({error:e.message},400);
   console.error('easyleague api error',String(e).split(' at ')[0].slice(0,250));
   return json({error:'Operasi gagal. Cuba lagi. / Operation failed. Please retry.'},500);
 }
}

// All SQL comes from the application module above. Values use positional parameters.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL'), {prepare:false,max:1,idle_timeout:20});
function operation(query, values=[]) {
  let position=0;
  const statement=query.replace(/\?/g,()=>'$'+(++position));
  return {
    bind:(...args)=>operation(query,args),
    execute:async tx=>({results:await tx.unsafe(statement,values)}),
    async run(){return (await storage.batch([this]))[0]},
    async first(){return (await this.run()).results[0] || null}
  };
}
const storage = {
  prepare:operation,
  batch: statements=>sql.begin(async tx=>{
    await tx.unsafe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await tx.unsafe('SET LOCAL search_path TO easyleague');
    const result=[];
    for(const stmt of statements)result.push(await stmt.execute(tx));
    return result;
  })
};
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'};
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url);
  const match=url.pathname.match(/\/easyleague(\/api\/.*)$/);
  const path=match?.[1];
  if(!path)return new Response('Not found',{status:404,headers:cors});
  try {
    const headers=new Headers({'content-type':request.headers.get('content-type')||''});
    if (!(request.method==='GET' && path.startsWith('/api/card/'))) {
      const auth=request.headers.get('authorization')||'';
      if(!auth.startsWith('Bearer '))return json({error:'Log masuk diperlukan / Sign in required'},401,cors);
      const verified=await fetch(Deno.env.get('SUPABASE_URL')+'/auth/v1/user',{headers:{authorization:auth,apikey:Deno.env.get('SUPABASE_ANON_KEY')||Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}'))[0]}});
      if(!verified.ok)return json({error:'Sesi tidak sah / Invalid session'},401,cors);
      const user=await verified.json();
      if(!user.id||!user.email_confirmed_at||!user.email)return json({error:'Sahkan e-mel / Verify your email'},403,cors);
      headers.set('oai-authenticated-user-id',user.id);
      headers.set('oai-authenticated-user-email',user.email);
    }
    const internal=new Request('https://easyleague.internal'+path,{method:request.method,headers,body:request.method==='POST'?await request.text():null});
    const response=await handleApi(internal,{DB:storage});
    const out=new Headers(response.headers);
    for(const [key,value] of Object.entries(cors))out.set(key,value);
    return new Response(response.body,{status:response.status,headers:out});
  } catch {return json({error:'Semak konfigurasi pangkalan data / Check database configuration'},503,cors)}
});

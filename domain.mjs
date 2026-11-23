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

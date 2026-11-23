const leagueConfig = window.easyleagueConfig;
const leagueBase = String(leagueConfig.url || '').trim().replace(/\/$/, '');
const leagueKey = leagueConfig.publishableKey.trim();
const sessionName = 'el-auth:' + leagueBase;
let renewal;
function session() {
  try { return JSON.parse(sessionStorage.getItem(sessionName)); } catch { return null; }
}
function remember(data) {
  sessionStorage.setItem(sessionName, JSON.stringify({
    token: data.access_token, refresh: data.refresh_token, expires: Date.now() + data.expires_in * 1000
  }));
}
function isConfigured(){
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(leagueBase) && leagueKey.length > 16 && !leagueKey.startsWith('sb_secret');
}
async function grant(kind, values) {
  const response = await fetch(leagueBase + '/auth/v1/token?grant_type=' + kind, {
    method:'POST',headers:{apikey:leagueKey,'Content-Type':'application/json'},body:JSON.stringify(values)
  });
  if (!response.ok) throw Error(L('Log masuk gagal. Semak e-mel dan kata laluan.','Sign-in failed. Check your email and password.'));
  remember(await response.json());
}
async function apiFetch(path, options = {}) {
  const error = (message,status) => new Response(JSON.stringify({error:message}),{status});
  if (!isConfigured()) return error(L('Isi URL projek dan publishable key dalam config.js, kemudian muat naik semula. Lihat PANDUAN-NETLIFY.md dalam ZIP.','Enter the project URL and publishable key in config.js, then redeploy. See PANDUAN-NETLIFY.md in the ZIP.'),503);
  const publicCard = path.startsWith('/api/card/');
  if (!publicCard && !session()) return error(L('Log masuk untuk membuka ruang kerja anda.','Sign in to open your workspace.'),401);
  if (!publicCard && session().expires < Date.now()+30000) {
    try { renewal ||= grant('refresh_token',{refresh_token:session().refresh}).finally(()=>{renewal=null}); await renewal; }
    catch { sessionStorage.removeItem(sessionName); return error(L('Sesi tamat. Log masuk semula.','Session expired. Sign in again.'),401); }
  }
  const headers = new Headers(options.headers);
  headers.set('apikey',leagueKey);
  if(!publicCard) headers.set('Authorization','Bearer '+session().token);
  return fetch(leagueBase+'/functions/v1/easyleague'+path,{...options,headers});
}
function loginFields() {
  if (!isConfigured()) return '';
  if (session()) return '<button onclick="leagueLogout()">'+L('Tukar akaun','Switch account')+'</button>';
  return '<form id="leagueLogin" onsubmit="leagueLoginSubmit(event)" style="display:grid;gap:12px"><label>E-mel / Email<input style="display:block;width:100%" name="email" type="email" required autocomplete="username"></label><label>'+L('Kata laluan','Password')+'<input style="display:block;width:100%" name="password" type="password" required autocomplete="current-password"></label><button>'+L('Log masuk','Sign in')+'</button></form>';
}
async function leagueLoginSubmit(event) {
  event.preventDefault(); const f=event.target; const button=f.querySelector('button'); button.disabled=true;
  try { await grant('password',{email:f.email.value.trim(),password:f.password.value}); await refresh(); }
  catch(e){notify(e.message)} finally{button.disabled=false;}
}
async function leagueLogout() {
  const token=session()?.token;
  sessionStorage.removeItem(sessionName);
  try{if(token)await fetch(leagueBase+'/auth/v1/logout',{method:'POST',headers:{apikey:leagueKey,Authorization:'Bearer '+token}});}finally{location.replace('/')}
}
async function leagueBackup() {
  try{const r=await apiFetch('/api/backup');if(!r.ok)throw Error((await r.json()).error);
    const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download='easyleague-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  } catch(e){notify(e.message)}
}

(() => {
  const roles = {
    admin: ['Pentadbir','Administrator'],
    lecturer: ['Pensyarah','Lecturer'],
    representative: ['Wakil pasukan','Team representative']
  };
  const collections = {
    competitions:['Pertandingan','Competition'],teams:['Pasukan','Team'],players:['Pemain','Player'],
    fixtures:['Perlawanan','Fixture'],assessments:['Pentaksiran','Assessment'],
    users:['Pengguna','User'],settings:['Tetapan','Settings'],backup:['Sandaran','Backup']
  };
  const actions = {
    save:['Simpan','Save'],create:['Daftar','Create'],update:['Kemas kini','Update'],
    delete:['Padam','Delete'],batch:['Import / kemas kini','Import / update'],restore:['Pulih','Restore'],
    criteria:['Rubrik','Rubric'],clearFixtures:['Kosongkan jadual','Clear fixtures'],settings:['Tetapan','Settings'],generate:['Jana jadual','Generate fixtures'],result:['Catat keputusan','Record result']
  };
  const fallbackCriteria = [
    ['disiplin','Disiplin','Discipline'],['kerjasama','Kerjasama','Teamwork'],
    ['strategi','Strategi permainan','Game strategy'],['komunikasi','Komunikasi','Communication'],
    ['kesukanan','Semangat kesukanan','Sportsmanship']
  ].map(([id,name,nameEn]) => ({id,name,nameEn,max:20}));
  const h = value => esc(String(value ?? '')).replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const t = (dict,key) => dict[key] ? L(...dict[key]) : String(key || '—');
  const isAdmin = () => S.me?.role === 'admin';
  const button = (label, action, extra='', id='') => '<button type="button" class="el-admin-btn '+extra+'" data-el-admin="'+h(action)+'" data-id="'+h(id)+'">'+h(label)+'</button>';
  const input = (name,label,value='',other='') => '<label>'+h(label)+'<input name="'+name+'" value="'+h(value)+'" '+other+'></label>';
  const opts = (list,current) => list.map(([v,n])=>'<option value="'+h(v)+'" '+(String(v)===String(current)?'selected':'')+'>'+h(n)+'</option>').join('');
  const head = (title,copy,action='') => '<div class="el-admin-head"><div><h3>'+h(title)+'</h3><p class="el-admin-copy">'+h(copy)+'</p></div>'+action+'</div>';
  const table = (labels,body) => '<div class="el-admin-table-wrap"><table class="el-admin-table"><thead><tr>'+labels.map(n=>'<th scope="col">'+h(n)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  const empty = message => '<p class="el-admin-empty">'+h(message)+'</p>';
  const submit = label => '<button class="el-admin-btn primary" type="submit">'+h(label)+'</button>';
  const errorBox = '<p role="alert" data-el-error hidden></p>';
  const formActions = () => '<div class="el-admin-actions">'+button(L('Batal','Cancel'),'close')+submit(L('Simpan','Save'))+'</div>'+errorBox;
  const roleText = role => t(roles,role);
  const teamName = id => S.teams?.find(x=>x.id===id)?.name || '—';
  const date = value => {
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'—':d.toLocaleString(L('ms-MY','en-GB'),{dateStyle:'medium',timeStyle:'short'});
  };
  function accounts() {
    if(!isAdmin()) return empty(L('Fungsi ini memerlukan akses pentadbir.','Administrator access is required.'));
    const rows=(S.users||[]).map(user=>{
      const label=user.name||user.email||'—';
      return '<tr><td><div class="el-admin-user"><span class="el-admin-avatar" aria-hidden="true">'+h(label.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase())+'</span><div><strong>'+h(label)+'</strong><span class="el-admin-muted">'+h(user.email)+'</span></div></div></td><td><span class="el-admin-pill">'+h(roleText(user.role))+'</span></td><td>'+h(user.teamId?teamName(user.teamId):'—')+'</td><td><div class="el-admin-actions">'+button(L('Sunting','Edit'),'edit-user','small',user.id)+(user.id===S.me.id?'':button(L('Batalkan akses','Revoke access'),'remove-user','small danger',user.id))+'</div></td></tr>';
    }).join('');
    return '<section class="el-admin-card">'+head(L('Akses pengguna','User access'),L('Gunakan alamat e-mel akaun Supabase pengguna untuk menetapkan peranan mereka.','Use each person’s Supabase account email to assign their role.'),button(L('Tambah pengguna','Add user'),'add-user','primary'))+table([L('Pengguna','User'),L('Peranan','Role'),L('Pasukan','Team'),L('Tindakan','Actions')],rows)+'</section>';
  }
  function userForm(id) {
    const user = (S.users||[]).find(x=>x.id===id)||{role:'lecturer'};
    const teamOptions = [['',L('Pilih pasukan','Choose a team')],...(S.teams||[]).map(team=>[team.id,(S.competitions.find(c=>c.id===team.competitionId)?.name||'')+' · '+team.name])];
    modal(id?L('Sunting pengguna','Edit user'):L('Tambah pengguna','Add user'),'<form class="el-admin-form" data-el-form="user" data-id="'+h(id)+'">'+input('name',L('Nama penuh','Full name'),user.name,'required maxlength="140"')+input('email',L('E-mel akaun Supabase','Supabase account email'),user.email,'type="email" required maxlength="254"')+'<label>'+L('Peranan','Role')+'<select name="role">'+opts(Object.keys(roles).map(k=>[k,roleText(k)]),user.role)+'</select></label><label data-el-team '+(user.role==='representative'?'':'hidden')+'>'+L('Pasukan yang diwakili','Represented team')+'<select name="teamId" '+(user.role==='representative'?'required':'')+'>'+opts(teamOptions,user.teamId)+'</select></label>'+formActions()+'</form>');
  }
  function criteriaOf(comp) { return comp?.criteria?.length?comp.criteria:fallbackCriteria; }
  function criterionRow(c={}) {
    return '<div class="el-admin-criterion" data-key="'+h(c.id||crypto.randomUUID())+'">'+input('name',L('Nama (BM)','Name (BM)'),c.name||c.bm,'required maxlength="80"')+input('nameEn',L('Nama (EN)','Name (EN)'),c.nameEn||c.en||c.name,'required maxlength="80"')+input('max',L('Markah penuh','Max score'),c.max||20,'required type="number" step="0.01" min="0.01" max="1000"')+button(L('Buang','Remove'),'remove-criterion','small danger')+'</div>';
  }
  function rubricForm() {
    const comp=selected();
    if(!comp) return;
    modal(L('Sunting rubrik','Edit rubric'),'<form class="el-admin-form" data-el-form="rubric" data-id="'+h(comp.id)+'"><p class="el-admin-copy">'+h(comp.name)+'</p><div data-el-criteria>'+criteriaOf(comp).map(criterionRow).join('')+'</div><div>'+button(L('Tambah kriteria','Add criterion'),'add-criterion')+'</div>'+formActions()+'</form>');
  }
  function settings() {
    const account = '<section class="el-admin-card">'+head(L('Sesi pengguna','Signed-in account'),L('Akses semasa menggunakan identiti Supabase anda.','Your current session uses your Supabase identity.'))+'<div class="el-admin-row"><div><strong>'+h(S.me?.name||S.me?.email)+'</strong><span class="el-admin-muted">'+h(roleText(S.me?.role))+'</span></div><a class="el-admin-btn" href="#" onclick="event.preventDefault();leagueLogout()" target="_top">'+L('Log keluar','Sign out')+'</a></div></section>';
    if(!isAdmin()) return account;
    const comp=selected();
    const rubric = '<section class="el-admin-card">'+head(L('Rubrik pentaksiran','Assessment rubric'),comp?comp.name:L('Pilih pertandingan untuk menetapkan kriteria dan markah.','Select a competition to configure criteria and marks.'),comp?button(L('Sunting rubrik','Edit rubric'),'edit-rubric'):'')+(comp?table([L('Kriteria','Criterion'),L('Markah penuh','Maximum marks')],criteriaOf(comp).map(c=>'<tr><td>'+h(L(c.name||c.bm,c.nameEn||c.en||c.name))+'</td><td>'+h(c.max)+'</td></tr>').join('')):'')+'</section>';
    return '<div class="el-admin-grid"><section class="el-admin-card">'+head(L('Maklumat institusi','Institution details'),L('Tetapkan nama institusi penganjur.','Set the name of the organising institution.'))+'<form data-el-form="settings" class="el-admin-form">'+input('institution',L('Nama institusi','Institution name'),S.settings?.institution,'maxlength="180"')+'<div>'+submit(L('Simpan tetapan','Save settings'))+'</div>'+errorBox+'</form></section>'+account+'</div>'+rubric+'<section class="el-admin-card">'+head(L('Sandaran pertandingan','Competition backup'),L('Muat turun salinan rekod pertandingan, pemain, pentaksiran dan aktiviti. Simpan fail ini di lokasi yang dilindungi.','Download a copy of competition, player, assessment and activity records. Store the file in a protected location.'))+'<div class="el-admin-tools"><a class="el-admin-btn primary" href="#" onclick="event.preventDefault();leagueBackup()">'+L('Muat turun sandaran','Download backup')+'</a>'+button(L('Pulihkan sandaran','Restore backup'),'restore')+'</div></section>';
  }
  function activity() {
    const logs=[...(S.logs||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
    const rows=logs.map(log=>'<tr><td>'+h(date(log.at))+'</td><td><strong>'+h(t(actions,log.action))+'</strong><span class="el-admin-muted">'+h(t(collections,log.collection))+'</span></td><td>'+h(log.name||log.recordId||'—')+'</td><td>'+h(log.actor||'—')+'</td><td>'+button(L('Butiran','Details'),'log','small',log.id)+'</td></tr>').join('');
    return '<section class="el-admin-card">'+head(L('Rekod aktiviti','Activity history'),L('Semak masa, pengguna dan butiran setiap perubahan.','Review the time, user and details of each change.'))+(rows?table([L('Masa','Time'),L('Aktiviti','Activity'),L('Rekod','Record'),L('Pengguna','User'),''],rows):empty(L('Belum ada aktiviti direkodkan.','No activity has been recorded yet.')))+'</section>';
  }
  function valueText(v) {
    if(v===undefined||v===null||v==='') return '—';
    if(typeof v==='string'&&v.startsWith('data:image/')) return L('Imej dimuat naik','Uploaded image');
    return typeof v==='object'?JSON.stringify(v,(_k,value)=>typeof value==='string'&&value.startsWith('data:image/')?'[image]':value,2):String(v);
  }
  function logDetails(id) {
    const log=S.logs.find(l=>l.id===id);
    if(!log) return;
    let body='';
    if(log.before!=null || log.after!=null) {
      if(log.action==='result') {
        const fixture=S.fixtures.find(f=>f.id===log.recordId);
        const count=Math.max(log.before?.length||0,log.after?.length||0);
        body=Array.from({length:count},(_,i)=>'<tr><th scope="row">'+h(teamName(fixture?.teamIds?.[i]))+'</th><td>'+h(log.before?.[i]??'—')+'</td><td>'+h(log.after?.[i]??'—')+'</td></tr>').join('');
      } else {
        const description=log.collection==='users'?L('Peranan','Role'):log.action==='generate'?L('Bilangan perlawanan','Match count'):t(collections,log.collection);
        const display=v=>log.collection==='users'&&v?roleText(v):Array.isArray(v)&&log.action==='criteria'?v.map(c=>L(c.name,c.nameEn||c.name)+' ('+c.max+')').join('\n'):valueText(v);
        body='<tr><th scope="row">'+h(description)+'</th><td class="el-admin-detail">'+h(display(log.before))+'</td><td class="el-admin-detail">'+h(display(log.after))+'</td></tr>';
      }
    }
    modal(L('Butiran aktiviti','Activity details'),'<div class="el-admin">'+head(t(actions,log.action)+' · '+t(collections,log.collection),[date(log.at),log.actor,log.name].filter(Boolean).join(' · '))+(body?table([L('Medan','Field'),L('Sebelum','Before'),L('Selepas','After')],body):empty(L('Tiada perincian medan bagi aktiviti ini.','No field-level details for this activity.')))+'</div>');
  }
  window.adminPage = page=>'<div class="el-admin">'+(page==='accounts'?accounts():page==='activity'?activity():settings())+'</div>';
  document.addEventListener('change',e=>{
    if(!e.target.matches('[data-el-form="user"] [name="role"]')) return;
    const wrap=e.target.form.querySelector('[data-el-team]'),rep=e.target.value==='representative';
    wrap.hidden=!rep; wrap.querySelector('select').required=rep;
  });
  document.addEventListener('click',e=>{
    const ctl=e.target.closest('[data-el-admin]');
    if(!ctl) return;
    const id=ctl.dataset.id;
    switch(ctl.dataset.elAdmin) {
      case 'close': closeModal(); break;
      case 'add-user': case 'edit-user': userForm(id); break;
      case 'edit-rubric': rubricForm(); break;
      case 'add-criterion': ctl.closest('form').querySelector('[data-el-criteria]').insertAdjacentHTML('beforeend',criterionRow()); break;
      case 'remove-criterion': ctl.closest('.el-admin-criterion').remove(); break;
      case 'log': logDetails(id); break;
      case 'remove-user': {
        const user=S.users.find(u=>u.id===id);if(!user) return;
        modal(L('Batalkan akses pengguna?','Revoke user access?'),'<form class="el-admin-form" data-el-form="remove" data-id="'+h(id)+'"><p>'+h(L('Pengguna ini akan kehilangan akses kepada easyleague.','This person will lose access to easyleague.'))+' <strong>'+h(user.email)+'</strong></p><div class="el-admin-actions">'+button(L('Batal','Cancel'),'close')+submit(L('Batalkan akses','Revoke access'))+'</div>'+errorBox+'</form>');
        break;
      }
      case 'restore':
        modal(L('Pulihkan sandaran','Restore backup'),'<form class="el-admin-form" data-el-form="restore"><p>'+L('Rekod pertandingan semasa akan digantikan dengan kandungan fail. Muat turun sandaran terkini sebelum meneruskan.','Current competition records will be replaced by the contents of the file. Download a current backup before proceeding.')+'</p><label>'+L('Fail sandaran JSON','JSON backup file')+'<input name="file" type="file" accept=".json,application/json" required></label><label><span><input style="width:auto;min-height:auto" type="checkbox" required> '+L('Saya bersetuju untuk menggantikan rekod semasa.','I agree to replace the current records.')+'</span></label><div class="el-admin-actions">'+button(L('Batal','Cancel'),'close')+submit(L('Pulihkan rekod','Restore records'))+'</div>'+errorBox+'</form>');break;
    }
  });
  document.addEventListener('submit',async e=>{
    const f=e.target;if(!f.dataset.elForm) return;
    e.preventDefault();
    const submitter=f.querySelector('[type=submit]'),error=f.querySelector('[data-el-error]');
    submitter.disabled=true;error.hidden=true;
    const d=Object.fromEntries(new FormData(f));
    try {
      switch(f.dataset.elForm) {
        case 'user': {
          const record={name:d.name.trim(),email:d.email.trim().toLowerCase(),role:d.role,teamId:d.role==='representative'?d.teamId:''};
          if(f.dataset.id) record.id=f.dataset.id;
          if(!record.name) throw Error(L('Masukkan nama pengguna.','Enter the user’s name.'));
          await save('save',{collection:'users',record});break;
        }
        case 'remove': await save('delete',{collection:'users',id:f.dataset.id});break;
        case 'settings': await save('settings',{settings:{...(S.settings||{}),institution:d.institution.trim()}});break;
        case 'rubric': {
          const criteria=Array.from(f.querySelectorAll('.el-admin-criterion'),row=>({id:row.dataset.key,name:row.querySelector('[name=name]').value.trim(),nameEn:row.querySelector('[name=nameEn]').value.trim(),max:Number(row.querySelector('[name=max]').value)}));
          if(!criteria.length||criteria.some(c=>!c.name||!c.nameEn)) throw Error(L('Masukkan sekurang-kurangnya satu kriteria lengkap.','Enter at least one complete criterion.'));
          const comp=S.competitions.find(c=>c.id===f.dataset.id);
          if(!comp) throw Error(L('Pertandingan tidak ditemui.','Competition not found.'));
          await save('criteria',{competitionId:comp.id,criteria});break;
        }
        case 'restore': {
          let backup;
          try {backup=JSON.parse(await d.file.text());} catch {throw Error(L('Fail JSON tidak sah.','Invalid JSON file.'));}
          if(backup?.version!==1||!backup.data||!Array.isArray(backup.data.competitions)) throw Error(L('Format sandaran easyleague tidak sah.','Invalid easyleague backup format.'));
          await save('restore',{backup});break;
        }
      }
      if(f.dataset.elForm!=='settings') closeModal();
    } catch(err) {error.textContent=err.message;error.hidden=false;}
    finally {submitter.disabled=false;}
  });
})();

(function(){
  const byId=(collection,id)=>S[collection]?.find(r=>r.id===id);
  const editable=()=>['admin','administrator','lecturer'].includes(S.me?.role);
  const belonging=(key)=>S[key].filter(x=>x.competitionId===active);
  const names={competitions:['Pertandingan','Competitions'],teams:['Pasukan / peserta','Teams / entrants'],players:['Pemain','Players'],cards:['Kad pemain','Player cards']};
  const fields={
    name:['Nama','Name'],sport:['Sukan','Sport'],category:['Kategori','Category'],date:['Tarikh mula','Start date'],location:['Lokasi','Venue'],lecturer:['Pensyarah bertanggungjawab','Lecturer in charge'],format:['Format pertandingan','Competition format'],direction:['Penentuan pemenang','Winning score'],win:['Mata menang','Win points'],draw:['Mata seri','Draw points'],loss:['Mata kalah','Loss points'],unit:['Unit keputusan','Scoring unit'],placePoints:['Mata mengikut kedudukan','Points by placing'],allowDraw:['Benarkan keputusan seri','Allow draws'],status:['Status','Status'],code:['Kod peserta','Entrant code'],logo:['Logo','Logo'],faculty:['Fakulti / jabatan','Faculty / department'],captain:['Ketua pasukan','Team captain'],phone:['Telefon ketua pasukan','Captain’s phone'],manager:['Pengurus / pensyarah','Manager / lecturer'],teamId:['Pasukan / peserta','Team / entrant'],matric:['Nombor matrik / pendaftaran','Matriculation / registration number'],photo:['Gambar pemain','Player photograph'],gender:['Jantina','Gender'],program:['Program pengajian','Programme of study'],year:['Tahun pengajian','Year of study'],jersey:['Nombor jersi','Jersey number'],position:['Posisi / peranan','Position / role'],eligible:['Layak bertanding','Eligible to compete'],verified:['Disahkan oleh pensyarah','Verified by lecturer'],contact:['Maklumat hubungan','Contact details']
  };
  const label=k=>L(...(fields[k]||[k,k]));
  const formats={single:['Liga satu pusingan','Single round robin'],double:['Liga dua pusingan','Double round robin'],groups:['Peringkat kumpulan','Group stage'],knockout:['Kalah mati','Knockout'],event:['Liga kedudukan beramai-ramai','Multi-entrant placing league']};
  const statuses={planned:['Dirancang','Planned'],active:['Sedang berlangsung','Active'],completed:['Selesai','Completed'],pending:['Menunggu','Pending'],registered:['Berdaftar','Registered'],withdrawn:['Menarik diri','Withdrawn']};
  const sports=['Badminton','Bola sepak / Football','Futsal','Bola jaring / Netball','Bola tampar / Volleyball','Bola keranjang / Basketball','Hoki / Hockey','Tenis / Tennis','Skuasy / Squash','Sepak takraw','Pingpong / Table tennis','Kriket / Cricket','Ragbi / Rugby','Boling / Bowling','Golf','Catur / Chess','Renang / Swimming','Olahraga / Athletics','E-sukan / Esports'];
  const translate=(map,k)=>map[k]?L(...map[k]):String(k??'');
  const button=(txt,fn,primary=false)=>'<button type="button" class="ro-btn '+(primary?'ro-primary':'')+'" onclick="'+fn+'">'+txt+'</button>';
  const keyAttr=(id)=>' data-key="'+esc(id)+'"';
  const rowButton=(txt,fun,id)=>'<button type="button" class="ro-link"'+keyAttr(id)+' onclick="'+fun+'(this.dataset.key)">'+txt+'</button>';
  const addNames={competitions:['Cipta pertandingan','Create competition'],teams:['Daftar peserta','Register entrant'],players:['Daftar pemain','Register player']};
  const pages={competitions:['Urus format, sukan dan peraturan pemarkahan bagi setiap pertandingan.','Manage each competition’s sport, format and scoring rules.'],teams:['Daftar pasukan, pasangan atau individu sebagai peserta pertandingan.','Register teams, pairs or individuals as competition entrants.'],players:['Urus maklumat pendaftaran, kelayakan dan pengesahan pemain.','Manage player registration, eligibility and verification.'],cards:['Kad akreditasi tersedia selepas pensyarah mengesahkan pemain.','Accreditation cards become available after the lecturer verifies a player.']};
  let current='competitions',context='',query='',teamFilter='',facet='';
  const cap=(s)=>String(s||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  function portrait(url,name,cls='ro-avatar'){
    return typeof url==='string'&&/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(url)?'<img alt="" class="'+cls+'" src="'+url+'">':'<span class="'+cls+'">'+esc(cap(name))+'</span>';
  }
  const empty=(title,sub)=>'<div class="ro-empty"><h3>'+title+'</h3><p>'+sub+'</p></div>';
  const format=k=>translate(formats,k);
  function listRows(page){
    const all=page==='competitions'?S.competitions:belonging(page==='cards'?'players':page);
    return all.filter(r=>(!query||[r.name,r.code,r.matric,r.sport].some(v=>String(v||'').toLocaleLowerCase().includes(query.toLocaleLowerCase())))&&(!teamFilter||r.teamId===teamFilter)&&(!facet||(page==='teams'?r.faculty:r.status)===facet)&&(page!=='cards'||r.verified));
  }
  function list(page){
    const rows=listRows(page);
    if(!rows.length)return empty(L('Tiada rekod untuk dipaparkan','No records to display'),query||teamFilter||facet?L('Cuba ubah carian atau penapis.','Try changing your search or filters.'):page==='cards'?L('Sahkan pendaftaran pemain untuk menjana kad.','Verify a player’s registration to generate a card.'):L('Rekod yang didaftarkan akan dipaparkan di sini.','Registered records will appear here.'));
    if(page==='cards')return '<div class="ro-cards">'+rows.map(p=>'<div class="ro-card-wrap">'+cardHTML(p)+'<div class="ro-actions">'+rowButton(L('Buka kad','Open card'),'rosterOpenCard',p.id)+'</div></div>').join('')+'</div>';
    const cols=page==='competitions'?[label('name'),label('sport'),label('format'),label('status')]:page==='teams'?[label('name'),label('code'),label('faculty'),L('Pemain','Players')]:[label('name'),label('matric'),label('teamId'),L('Pengesahan','Verification')];
    return '<div class="ro-scroll"><table class="ro-table"><thead><tr>'+[...cols,L('Tindakan','Actions')].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>{
      const details=page==='competitions'?[esc(r.sport),esc(format(r.format)),esc(translate(statuses,r.status))]:page==='teams'?[esc(r.code),esc(r.faculty||'—'),S.players.filter(p=>p.teamId===r.id).length]:[esc(r.matric),esc(byId('teams',r.teamId)?.name||'—'),r.verified?L('Disahkan','Verified'):L('Menunggu','Pending')];
      return '<tr><td><span class="ro-name">'+portrait(r.logo||r.photo,r.name)+'<strong>'+esc(r.name)+'</strong></span></td>'+details.map(v=>'<td>'+v+'</td>').join('')+'<td>'+rowButton(L('Lihat','View'),'rosterDetail',r.id)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  }
  window.rosterFilter=function(el,k){if(k==='q')query=el.value;else if(k==='t')teamFilter=el.value;else facet=el.value;document.getElementById('ro-list').innerHTML=list(current)};
  window.rosterPage=function(page){
    if(current!==page||context!==active){current=page;context=active;query='';teamFilter='';facet=''}
    const comp=selected();
    if(!comp&&page!=='competitions')return empty(L('Pilih pertandingan dahulu','Select a competition first'),L('Buka modul Pertandingan untuk mencipta atau memilih pertandingan.','Open Competitions to create or select a competition.'));
    const add=editable()&&page!=='cards'?button('+ '+L(...addNames[page]),"rosterForm('"+page+"')",true):'';
    const tools=page==='teams'||page==='players'?button(L('Import / eksport','Import / export'),"rosterExchange('"+page+"')"):page==='cards'?button(L('Cetak kad','Print cards'),'rosterPrintCards(document.getElementById(\'ro-team\')?.value)'):'';
    const teamSel=page==='players'||page==='cards'?'<select aria-label="'+label('teamId')+'" id="ro-team" onchange="rosterFilter(this,\'t\')"><option value="">'+L('Semua peserta','All entrants')+'</option>'+belonging('teams').map(t=>'<option value="'+esc(t.id)+'" '+(t.id===teamFilter?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>':'';
    const facets=page==='teams'?[...new Set(belonging('teams').map(t=>t.faculty).filter(Boolean))]:page==='competitions'?['planned','active','completed']:[];
    const fs=facets.length?'<select aria-label="'+L('Penapis','Filter')+'" onchange="rosterFilter(this,\'f\')"><option value="">'+(page==='teams'?L('Semua fakulti','All faculties'):L('Semua status','All statuses'))+'</option>'+facets.map(s=>'<option value="'+esc(s)+'" '+(s===facet?'selected':'')+'>'+esc(page==='teams'?s:translate(statuses,s))+'</option>').join('')+'</select>':'';
    return '<section class="ro-panel"><div class="ro-intro"><p>'+L(...pages[page])+'</p><div class="ro-actions">'+tools+add+'</div></div><div class="ro-filter"><input aria-label="'+L('Carian','Search')+'" type="search" value="'+esc(query)+'" placeholder="'+L('Cari nama atau kod…','Search name or code…')+'" oninput="rosterFilter(this,\'q\')">'+teamSel+fs+'</div><div id="ro-list">'+list(page)+'</div></section>';
  };
  function control(k,r,opts={}){
    const v=r[k]??opts.def??'',type=opts.type||'text';
    const req=opts.req?' required':'',title=label(k)+(opts.req?' *':'');
    if(type==='check')return '<label class="ro-checkbox"><input type="checkbox" name="'+k+'" '+(v?'checked':'')+'>'+title+'</label>';
    let input='';
    if(opts.options)input='<select name="'+k+'"'+req+'>'+opts.options.map(([val,txt])=>'<option value="'+esc(val)+'" '+(String(v)===String(val)?'selected':'')+'>'+esc(txt)+'</option>').join('')+'</select>';
    else if(type==='file')input='<input type="file" name="'+k+'" accept="image/png,image/jpeg,image/webp">';
    else input='<input name="'+k+'" type="'+type+'" value="'+esc(v)+'"'+req+(opts.extra||'')+'>';
    return '<label class="ro-field"><span>'+title+'</span>'+input+'</label>';
  }
  const options=(m,keys=Object.keys(m))=>keys.map(k=>[k,translate(m,k)]);
  window.rosterForm=function(c,id){
    if(!editable())return;
    const r=id?byId(c,id):{};
    if(c==='players'&&!belonging('teams').length)return notify(L('Daftar peserta dahulu.','Register an entrant first.'));
    if(!r)return;
    let form='';
    const section=(name,arr)=>'<fieldset><legend>'+name+'</legend><div class="ro-grid">'+arr.join('')+'</div></fieldset>';
    const f=(k,o)=>control(k,r,o);
    if(c==='competitions'){
      form=section(L('Maklumat pertandingan','Competition details'),[f('name',{req:true}),f('sport',{req:true,extra:' list="ro-sports" maxlength="100" placeholder="'+L('Pilih atau taip nama sukan','Select or enter a sport')+'"'}),f('category'),f('date',{req:true,type:'date',def:new Date().toLocaleDateString('en-CA')}),f('location',{req:true}),f('lecturer'),f('status',{options:options(statuses,['planned','active','completed'])})])+'<datalist id="ro-sports">'+sports.map(s=>'<option value="'+esc(s)+'">').join('')+'</datalist>'+section(L('Format dan pemarkahan','Format and scoring'),[f('format',{options:options(formats)}),f('unit',{def:L('Mata','Points')}),f('direction',{options:[['higher',L('Skor tertinggi','Highest score')],['lower',L('Skor terendah / masa terpantas','Lowest score / fastest time')]]}),...['win','draw','loss'].map((k,i)=>f(k,{type:'number',req:true,def:[3,1,0][i],extra:' step="any"'})),f('placePoints',{def:'10,6,4,2,1',extra:' placeholder="10,6,4,2,1"'}),f('allowDraw',{type:'check',def:true})]);
    }else if(c==='teams')form=section(L('Profil peserta','Entrant profile'),[f('name',{req:true}),f('code',{req:true}),f('logo',{type:'file'}),f('faculty'),f('captain'),f('phone',{type:'tel'}),f('manager')]);
    else form=section(L('Identiti pemain','Player identity'),[f('name',{req:true}),f('matric',{req:true}),f('photo',{type:'file'}),f('gender'),f('faculty'),f('program'),f('year'),f('contact')])+section(L('Pendaftaran sukan','Sport registration'),[f('teamId',{req:true,options:belonging('teams').map(t=>[t.id,t.name])}),f('jersey'),f('position'),f('category'),f('status',{def:'registered',options:options(statuses,['registered','pending','withdrawn'])}),f('eligible',{type:'check',def:true}),f('verified',{type:'check'})]);
    modal(id?L('Kemas kini rekod','Edit record'):L(...addNames[c]),'<form class="ro-form" data-type="'+c+'"'+keyAttr(id||'')+' onsubmit="rosterSubmit(event)">'+form+'<div class="ro-footer">'+button(L('Batal','Cancel'),'closeModal()')+'<button type="submit" class="ro-btn ro-primary">'+L('Simpan','Save')+'</button></div></form>');
  };
  window.rosterPreset=function(name){
    const f=document.querySelector('form.ro-form[data-type="competitions"]');if(!f)return;
    const sport = typeof catalog!=='undefined'?catalog.find(s=>s[1]===name):null;
    if(!sport)return;
    f.elements.sport.value=sport[0]==='other'?'':L(sport[1],sport[2]);
    f.elements.unit.value=L(sport[3],sport[4]);
    f.elements.allowDraw.checked=!['badminton','basketball','volleyball','netball'].includes(sport[0]);
    if(sport[0]==='other')f.elements.sport.focus();
  };
  async function reducedImage(file){
    if(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>7000000)throw Error(L('Pilih JPG, PNG atau WebP di bawah 7 MB.','Choose a JPG, PNG or WebP under 7 MB.'));
    const u=URL.createObjectURL(file);
    try{const img=new Image();img.src=u;await img.decode();
      const scale=Math.min(1,360/Math.max(img.naturalWidth,img.naturalHeight));
      const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.width*scale));cv.height=Math.max(1,Math.round(img.height*scale));
      const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height);return cv.toDataURL('image/jpeg',.8);
    }finally{URL.revokeObjectURL(u)}
  }
  window.rosterSubmit=async function(ev){
    ev.preventDefault();const form=ev.target,c=form.dataset.type,id=form.dataset.key;
    const record={...(id?byId(c,id):{})}; if(c!=='competitions')record.competitionId=active;
    const submit=form.querySelector('[type=submit]');submit.disabled=true;
    try{
      for(const field of form.elements){if(!field.name)continue;
        if(field.type==='file'){if(field.files[0])record[field.name]=await reducedImage(field.files[0]);}
        else if(field.type==='checkbox')record[field.name]=field.checked;
        else if(field.type==='number')record[field.name]=Number(field.value);
        else if(field.name==='placePoints'){record.placePoints=field.value.split(',').map(n=>Number(n.trim()));if(!field.value.trim()||record.placePoints.some(n=>!Number.isFinite(n)||n<0))throw Error(L('Masukkan mata kedudukan dipisahkan dengan koma.','Enter placing points separated by commas.'))}
        else record[field.name]=field.value.trim();
      }
      const result=await save('save',{collection:c,record});if(result!==false){closeModal();if(c==='competitions'&&!id){const fresh=S.competitions.find(t=>t.name===record.name);if(fresh)chooseCompetition(fresh.id)}}
    }catch(e){notify(e.message)}finally{submit.disabled=false}
  };
  window.rosterRemove=async function(c,id){
    if(!editable()||!confirm(L('Padam rekod ini? Rekod berkaitan mungkin turut dipadam.','Delete this record? Related records may also be removed.')))return;
    try{if(await save('delete',{collection:c,id})!==false)closeModal()}catch(e){notify(e.message)}
  };
  window.rosterDetail=function(id){
    const c=current,r=byId(c,id);if(!r)return;
    const keys=c==='competitions'?['sport','format','category','date','location','lecturer','status','unit','direction','win','draw','loss']:c==='teams'?['code','faculty','captain','phone','manager']:['matric','teamId','faculty','program','year','gender','contact','jersey','position','category','status','eligible','verified'];
    const val=k=>k==='teamId'?byId('teams',r[k])?.name:k==='direction'?(r[k]==='lower'?L('Terendah','Lowest'):L('Tertinggi','Highest')):k==='format'?format(r[k]):k==='status'?translate(statuses,r[k]):typeof r[k]==='boolean'?(r[k]?L('Ya','Yes'):L('Tidak','No')):r[k];
    const detail=keys.map(k=>'<div><dt>'+label(k)+'</dt><dd>'+esc(val(k)??'—')+'</dd></div>').join('');
    const roster=c==='teams'?S.players.filter(p=>p.teamId===id):null;
    const inline=(txt,code)=>'<button type="button" class="ro-btn"'+keyAttr(id)+' onclick="'+code+'">'+txt+'</button>';
    const actions=(c==='competitions'?inline(L('Pilih pertandingan','Select competition'),'closeModal();chooseCompetition(this.dataset.key)'):'')+(c==='players'&&r.verified?inline(L('Buka kad','Open card'),'rosterOpenCard(this.dataset.key)'):'')+(editable()?inline(L('Edit','Edit'),"rosterForm('"+c+"',this.dataset.key)")+inline(L('Padam','Delete'),"rosterRemove('"+c+"',this.dataset.key)"):'');
    modal(r.name,'<div class="ro-profile">'+portrait(r.photo||r.logo,r.name)+'</div><dl class="ro-detail">'+detail+'</dl>'+(roster?'<h3>'+L('Senarai pemain','Player roster')+' ('+roster.length+')</h3><ul>'+roster.map(p=>'<li>'+esc(p.name)+'</li>').join('')+'</ul>':'')+'<div class="ro-footer">'+actions+'</div>');
  };
  const columns={teams:['name','code','faculty','captain','phone','manager'],players:['name','matric','teamCode','jersey','position','category','faculty','program','year','gender','contact','status','eligible','verified']};
  function exportRows(c){
    return belonging(c).map(r=>columns[c].map(k=>k==='teamCode'?byId('teams',r.teamId)?.code:r[k]));
  }
  window.rosterExchange=function(c){
    const cols=columns[c],required=c==='teams'?'name, code':'name, matric, teamCode';
    modal(L('Import dan eksport','Import and export'),'<div class="ro-exchange"><h3>'+L('Eksport rekod','Export records')+'</h3><div class="ro-actions">'+button('CSV',"rosterExport('"+c+"','csv',false)")+button('Excel (.xlsx)',"rosterExport('"+c+"','xlsx',false)")+'</div>'+(editable()?'<h3>'+L('Import rekod','Import records')+'</h3><p>'+L('Muat turun templat dan isi satu rekod setiap baris. Lajur wajib','Download the template and enter one record per row. Required columns')+' <strong>'+required+'</strong>.</p>'+(c==='players'?'<p>'+L('Gunakan kod peserta berdaftar bagi teamCode. Isi true atau false bagi eligible dan verified.','Use a registered entrant code for teamCode. Enter true or false for eligible and verified.')+'</p>':'')+'<div class="ro-actions">'+button(L('Templat Excel','Excel template'),"rosterExport('"+c+"','xlsx',true)")+'</div><form onsubmit="rosterImport(event,\''+c+'\')"><label class="ro-field"><span>'+L('Fail CSV atau Excel','CSV or Excel file')+'</span><input type="file" required accept=".csv,.xlsx"></label><button class="ro-btn ro-primary" type="submit">'+L('Import rekod','Import records')+'</button></form>':'')+'</div>');
  };
  window.rosterExport=async function(c,kind,template){
    try{await (kind==='csv'?rosterCSV:rosterWorkbook)((template?'template-':'')+c,columns[c],template?[]:exportRows(c));}catch(e){notify(e.message)}
  };
  window.rosterImport=async function(ev,c){
    ev.preventDefault();const f=ev.target,submit=f.querySelector('button');submit.disabled=true;
    try{
      const raw=await rosterReadRows(f.querySelector('input').files[0]);
      const headers=(raw.shift()||[]).map(h=>String(h||'').trim());
      const required=c==='teams'?['name','code']:['name','matric','teamCode'];
      if(required.some(k=>!headers.includes(k))||new Set(headers).size!==headers.length)throw Error(L('Gunakan tajuk lajur daripada templat.','Use the column headings from the template.'));
      const teams=belonging('teams');const norm=s=>String(s||'').trim().toLowerCase();
      const keys=new Set(belonging(c).map(r=>norm(c==='teams'?r.code:r.matric)));
      const records=raw.map((vals,i)=>{
        if(!vals.some(v=>String(v||'').trim()))return null;
        const data={};headers.forEach((k,j)=>{if(columns[c].includes(k))data[k]=String(vals[j]??'').trim()});
        const rowLabel=L('Baris ','Row ')+(i+2)+' · ';
        if(required.some(k=>!data[k]))throw Error(rowLabel+L('Maklumat wajib tidak lengkap.','Required values are missing.'));
        const key=norm(c==='teams'?data.code:data.matric);
        if(keys.has(key))throw Error(rowLabel+L('Kod atau nombor matrik telah didaftarkan.','The code or registration number already exists.'));
        keys.add(key);data.competitionId=active;
        if(c==='players'){const team=teams.find(t=>norm(t.code)===norm(data.teamCode));if(!team)throw Error(rowLabel+L('Kod peserta tidak dikenali.','Unknown entrant code.'));
          data.teamId=team.id;delete data.teamCode;
          for(const k of ['verified','eligible']){
            if(data[k]&&!['true','false','1','0','yes','no','ya','tidak'].includes(norm(data[k])))throw Error(rowLabel+label(k)+' · true / false');
            data[k]=data[k]?['true','1','yes','ya'].includes(norm(data[k])):k==='eligible';
          }
          data.status=data.status||'registered';
          if(!['registered','pending','withdrawn'].includes(data.status))throw Error(rowLabel+'status · registered / pending / withdrawn');
        }
        return data;
      }).filter(Boolean);
      if(!records.length)throw Error(L('Tiada rekod untuk diimport.','No records to import.'));
      if(await save('batch',{collection:c,records})!==false)closeModal();
    }catch(e){notify(e.message)}finally{submit.disabled=false}
  };
  function qr(id){
    const target=new URL('/',location.origin);target.searchParams.set('card',id);
    const code=new RosterQR(-1,1);code.addData(target.href);code.make();return code;
  }
  function drawQR(ctx,id,x,y,size){
    const code=qr(id),n=code.getModuleCount(),k=Math.floor(size/(n+8)),offset=Math.round((size-k*n)/2);
    ctx.fillStyle='#fff';ctx.fillRect(x,y,size,size);ctx.fillStyle='#082e29';
    for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(code.isDark(row,col))ctx.fillRect(x+offset+col*k,y+offset+row*k,k,k);
  }
  function qrURL(id){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=300;drawQR(canvas.getContext('2d'),id,0,0,300);return canvas.toDataURL();
  }
  function cardHTML(p){
    const t=byId('teams',p.teamId)||{},comp=byId('competitions',p.competitionId)||{};
    return '<article class="ro-accredit"><header><b>easyleague</b><span>'+L('KAD PEMAIN','PLAYER CARD')+'</span></header><div class="ro-card-main">'+portrait(p.photo,p.name,'ro-headshot')+'<div><small>'+esc(comp.sport||'')+'</small><h3>'+esc(p.name)+'</h3><span>'+esc(p.matric)+'</span></div></div><div class="ro-card-team">'+portrait(t.logo,t.name)+'<div><b>'+esc(t.name||'')+'</b><small>'+esc(comp.name||'')+'</small></div></div><footer><div><span>'+esc([p.jersey?'#'+p.jersey:'',p.position].filter(Boolean).join(' · ')||'—')+'</span><strong>✓ '+L('Disahkan','Verified')+'</strong><small>'+esc(p.id)+'</small></div><img class="ro-qr" src="'+qrURL(p.id)+'" alt="QR"></footer></article>';
  }
  window.rosterOpenCard=function(id){
    const p=byId('players',id);if(!p?.verified)return;
    modal(L('Kad pemain digital','Digital player card'),'<div class="ro-single">'+cardHTML(p)+'</div><div class="ro-footer">'+rowButton(L('Muat turun PNG','Download PNG'),'rosterDownloadCard',id)+rowButton(L('Cetak / PDF','Print / PDF'),'rosterPrintOne',id)+'</div>');
  };
  function printCards(players){
    if(!players.length)return notify(L('Tiada kad pemain yang disahkan.','There are no verified player cards.'));
    const iframe=document.createElement('iframe');iframe.style.cssText='position:fixed;right:100%;width:880px;height:600px;border:0';document.body.append(iframe);
    const doc=iframe.contentDocument;doc.open();doc.write('<!doctype html><html><head><title>easyleague — '+L('Kad pemain','Player cards')+'</title><link rel="stylesheet" href="/roster.css"></head><body class="ro-print"><main class="ro-card-sheet">'+players.map(cardHTML).join('')+'</main></body></html>');doc.close();
    const fire=async()=>{await Promise.all([...doc.images].map(img=>img.decode().catch(()=>{})));iframe.contentWindow.focus();iframe.contentWindow.print();};
    iframe.contentWindow.addEventListener('afterprint',()=>setTimeout(()=>iframe.remove(),250),{once:true});
    if(doc.readyState==='complete')fire();else iframe.addEventListener('load',fire,{once:true});
  }
  window.rosterPrintCards=team=>printCards(belonging('players').filter(p=>p.verified&&(!team||p.teamId===team)));
  window.rosterPrintOne=id=>printCards(S.players.filter(p=>p.verified&&p.id===id));
  window.rosterDownloadCard=async function(id){
    try{
      const p=byId('players',id),t=byId('teams',p.teamId),c=byId('competitions',p.competitionId);
      const canvas=document.createElement('canvas');canvas.width=900;canvas.height=610;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f9f4';ctx.fillRect(0,0,900,610);ctx.fillStyle='#073a32';ctx.fillRect(0,0,900,88);
      const txt=(s,x,y,size,colour,weight=500,width=800)=>{ctx.fillStyle=colour;ctx.font=weight+' '+size+'px Arial';ctx.fillText(String(s??''),x,y,width)};
      txt('easyleague',35,58,48,'white',750);txt(L('KAD PEMAIN','PLAYER CARD'),640,52,26,'#bdedae',600);
      async function pic(url,x,y,w,h,name){ctx.fillStyle='#d5e9db';ctx.fillRect(x,y,w,h);if(url&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(url)){const img=new Image();img.src=url;await img.decode();const ratio=Math.max(w/img.width,h/img.height),sw=w/ratio,sh=h/ratio;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h)}else txt(cap(name),x+w*.12,y+h*.65,Math.round(w*.45),'#195749',700,w*.8)}
      await pic(p.photo,35,120,140,162,p.name);
      txt(c.sport,205,150,25,'#31745f',600,650);txt(p.name,205,209,48,'#123d33',750,650);txt(p.matric,205,255,29,'#46705e',500,650);
      await pic(t.logo,35,314,60,60,t.name);txt(t.name,115,338,27,'#153e35',700,520);txt(c.name,115,371,25,'#415d50',500,520);
      txt([p.jersey?'#'+p.jersey:'',p.position].filter(Boolean).join(' · '),35,438,34,'#153e35',650,540);
      txt('✓ '+L('Disahkan','Verified'),35,490,28,'#087452',700);
      txt(id,35,558,19,'#4f635b',500,570);drawQR(ctx,id,631,345,230);
      const a=Object.assign(document.createElement('a'),{href:canvas.toDataURL('image/png'),download:'easyleague-'+p.matric+'.png'});a.click();
    }catch(e){notify(e.message)}
  };
  window.rosterVerifyCard=async function(){
    const root=document.getElementById('app')||document.body;const id=new URLSearchParams(location.search).get('card');
    try{
      const response=await apiFetch('/api/card/'+encodeURIComponent(id));if(!response.ok)throw Error();
      const p=await response.json(),safe=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
      root.innerHTML='<main class="ro-verify"><div class="ro-verify-brand">easyleague</div><h1>Pengesahan pemain <small>Player verification</small></h1>'+portrait(p.photo,p.name,'ro-headshot')+'<h2>'+safe(p.name)+'</h2><p>'+safe(p.teamName)+' · '+safe(p.sport)+'</p><p>'+safe(p.competitionName)+'</p><p>'+safe([p.jersey?'#'+p.jersey:'',p.position].filter(Boolean).join(' · '))+'</p><strong>✓ Disahkan / Verified</strong><p>'+safe(translate(statuses,p.status))+'</p></main>';
    }catch{root.innerHTML='<main class="ro-verify"><b>easyleague</b><h1>Kad tidak tersedia</h1><p>This card is unavailable.</p></main>'}
  };
})();

/* XLSX interchange for roster and report tables, with all identifier cells written as text. */
(function () {
  const xml = s => String(s ?? '').replace(/[<>&"']/g, x => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[x]));
  function download(filename, data, type) {
    const href=URL.createObjectURL(data instanceof Blob ? data : new Blob([data],{type}));
    const a=Object.assign(document.createElement('a'),{download:filename,href}); a.click();
    setTimeout(()=>URL.revokeObjectURL(href),10000);
  }
  function column(index) {
    let s=''; for(let n=index+1;n;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s;
    return s;
  }
  window.rosterCSV = function(name,headers,rows) {
    const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,s=>"'"+s).replace(/"/g,'""')+'"';
    download(name.replace(/\.csv$/i,'')+'.csv','\uFEFF'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  };
  window.rosterWorkbook=async function(name,headers,rows) {
    const z=new JSZip();
    const base='http://schemas.openxmlformats.org/',doc=base+'officeDocument/2006/relationships',main=base+'spreadsheetml/2006/main';
    z.file('[Content_Types].xml','<Types xmlns="'+base+'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    const rel=(type,target)=>'<Relationships xmlns="'+base+'package/2006/relationships"><Relationship Id="rId1" Type="'+doc+'/'+type+'" Target="'+target+'"/></Relationships>';
    z.file('_rels/.rels',rel('officeDocument','xl/workbook.xml'));
    z.file('xl/workbook.xml','<workbook xmlns="'+main+'" xmlns:r="'+doc+'"><sheets><sheet name="easyleague" sheetId="1" r:id="rId1"/></sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels',rel('worksheet','worksheets/sheet1.xml'));
    z.file('xl/worksheets/sheet1.xml','<worksheet xmlns="'+main+'"><sheetData>'+[headers,...rows].map((r,i)=>'<row r="'+(i+1)+'">'+r.map((v,j)=>'<c r="'+column(j)+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>');
    download(name.replace(/\.xlsx$/i,'')+'.xlsx',await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  };
  function csvRows(text) {
    text=text.replace(/^\uFEFF/,'');
    const rows=[]; let row=[],s='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){s+='"';i++}else quoted=!quoted}
      else if(c===','&&!quoted){row.push(s);s=''}
      else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(s);rows.push(row);row=[];s=''}
      else s+=c;
    }
    if(quoted)throw Error(L('Tanda petikan CSV tidak lengkap.','An opening quotation mark in the CSV is missing its closing mark.'));
    if(row.length||s)rows.push([...row,s]); return rows;
  }
  window.rosterReadRows=async function(file){
    if(file.size>5000000)throw Error(L('Had saiz fail ialah 5 MB.','The maximum file size is 5 MB.'));
    if(/\.csv$/i.test(file.name)) return csvRows(await file.text());
    if(!/\.xlsx$/i.test(file.name))throw Error(L('Pilih fail .csv atau .xlsx.','Choose a .csv or .xlsx file.'));
    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    async function parse(path) {
      const entry=zip.file(path);
      if(!entry || entry._data.uncompressedSize>10000000)throw Error(L('Lembaran Excel tidak sah atau terlalu besar.','The worksheet is invalid or too large.'));
      return new DOMParser().parseFromString(await entry.async('string'),'application/xml');
    }
    const wb=await parse('xl/workbook.xml'), rels=await parse('xl/_rels/workbook.xml.rels');
    const first=wb.getElementsByTagNameNS('*','sheet')[0];
    const id=first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const target=[...rels.getElementsByTagNameNS('*','Relationship')].find(r=>r.getAttribute('Id')===id)?.getAttribute('Target');
    if(!target)throw Error(L('Lembaran pertama tidak ditemui.','First worksheet not found.'));
    const sheet=await parse(new URL(target,'https://file.invalid/xl/workbook.xml').pathname.slice(1));
    const texts=el=>[...el.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('');
    const shared=zip.file('xl/sharedStrings.xml')?[...(await parse('xl/sharedStrings.xml')).getElementsByTagNameNS('*','si')].map(texts):[];
    return [...sheet.getElementsByTagNameNS('*','row')].map(el=>{
      const out=[]; for(const c of el.getElementsByTagNameNS('*','c')){
        const ref=c.getAttribute('r')?.match(/^[A-Z]+/)?.[0]||column(out.length);
        let ix=0;for(const l of ref)ix=ix*26+l.charCodeAt(0)-64;
        if(ix>100)throw Error(L('Terlalu banyak lajur.','Too many columns.'));
        const v=c.getElementsByTagNameNS('*','v')[0]?.textContent||'';
        out[ix-1]=c.getAttribute('t')==='s'?shared[Number(v)]||'':c.getAttribute('t')==='inlineStr'?texts(c):v;
      }return out;
    });
  };
})();

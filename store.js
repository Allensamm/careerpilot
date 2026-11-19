(() => {
'use strict';
const $=s=>document.querySelector(s);
const grid=$('#product-grid'),filterBox=$('#category-filter'),search=$('#product-search'),sort=$('#product-sort'),count=$('#product-count'),more=$('#load-more'),empty=$('#empty-state'),dialog=$('#product-dialog'),dialogContent=$('#dialog-content'),toast=$('#toast');
const colours={business:'#142b43',productivity:'#344a5d',marketing:'#5b3038',finance:'#1f4a3d',freelance:'#443653',career:'#263e5c',personal:'#66503f',creator:'#57365a',operations:'#2c4b49'};
let products=[],active='all',query='',order='featured',visible=24;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildFilters(categories){filterBox.innerHTML='<button type="button" data-filter="all" class="active" aria-pressed="true">All products <span>'+products.length+'</span></button>'+categories.map(c=>'<button type="button" data-filter="'+esc(c.key)+'" aria-pressed="false">'+esc(c.label)+' <span>'+c.count+'</span></button>').join('');}
function matching(){let list=products.filter(p=>(active==='all'||p.categoryKey===active)&&(!query||[p.title,p.category,p.format,p.description,...(p.tags||[])].join(' ').toLowerCase().includes(query)));if(order==='az')list.sort((a,b)=>a.title.localeCompare(b.title));else if(order==='category')list.sort((a,b)=>a.category.localeCompare(b.category)||a.title.localeCompare(b.title));else list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)||(a.original?-1:0)-(b.original?-1:0)||a.title.localeCompare(b.title));return list;}

let activeReaderUrl=null;
function asciiText(s){return String(s??'').normalize('NFKD').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();}
function pdfEscape(s){return asciiText(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function pdfWrap(s,max){const words=asciiText(s).split(/\s+/),lines=[];let line='';words.forEach(w=>{if((line+' '+w).trim().length>max&&line){lines.push(line);line=w;}else line=(line+' '+w).trim();});if(line)lines.push(line);return lines;}
function pdfRgb(hex,stroke){const h=String(hex||'#101827').replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;return r.toFixed(3)+' '+g.toFixed(3)+' '+b.toFixed(3)+(stroke?' RG':' rg');}
function pdfText(a,x,y,size,value,bold,color,maxChars){const lines=pdfWrap(value,maxChars||82);lines.forEach((line,i)=>a.push('BT /F'+(bold?'2':'1')+' '+size+' Tf '+pdfRgb(color||'#172A43',false)+' 1 0 0 1 '+x+' '+(y-i*(size+4))+' Tm ('+pdfEscape(line)+') Tj ET'));return y-lines.length*(size+4);}
function pdfRect(a,x,y,w,h,fill,stroke){if(fill)a.push(pdfRgb(fill,false)+' '+x+' '+y+' '+w+' '+h+' re f');if(stroke)a.push(pdfRgb(stroke,true)+' 0.8 w '+x+' '+y+' '+w+' '+h+' re S');}
function pdfLine(a,x1,y1,x2,y2,color,width){a.push(pdfRgb(color||'#dfe5ec',true)+' '+(width||0.8)+' w '+x1+' '+y1+' m '+x2+' '+y2+' l S');}
function pdfHeader(section,num){const a=[];pdfRect(a,0,0,612,792,'#ffffff');pdfRect(a,0,0,9,792,'#f07845');pdfText(a,44,755,8,'CAREERPILOT DIGITAL',true,'#536176',50);pdfText(a,395,755,8,section.toUpperCase(),true,'#c56b45',40);pdfLine(a,44,738,568,738,'#dfe5ec',0.8);pdfLine(a,44,42,568,42,'#dfe5ec',0.8);pdfText(a,44,25,7,'PRINT / ANNOTATE / REPEAT',true,'#8291a3',40);pdfText(a,525,25,7,String(num).padStart(2,'0')+' / 06',true,'#8291a3',12);return a;}
function buildGeneratedPdf(p){
 const pages=[];
 let a=[];
 // 01 - Cover
 a=[];pdfRect(a,0,0,612,792,'#101827');pdfRect(a,0,0,13,792,'#f07845');pdfText(a,54,735,9,'CAREERPILOT DIGITAL  /  ORIGINAL RESOURCE',true,'#dce4ec',75);pdfLine(a,54,715,558,715,'#506176',0.8);pdfText(a,54,675,9,String(p.category||'').toUpperCase(),true,'#f07845',60);
 let y=pdfText(a,54,610,30,p.title,true,'#ffffff',30);
 y=pdfText(a,54,y-22,12,p.description,false,'#d2dbe5',76);
 pdfRect(a,54,210,504,112,'#172a43','#40536a');pdfText(a,76,290,9,'INSIDE THIS EDITION',true,'#f07845',40);
 pdfText(a,76,265,10,'A practical six-page working resource',false,'#ffffff',60);
 pdfText(a,76,244,9,'Start here  /  Method  /  Worksheet  /  Tracker  /  30-day plan',false,'#d2dbe5',70);
 pdfText(a,54,105,8,'PLAN WITH CLARITY. MAKE THE NEXT STEP PRACTICAL.',true,'#d2dbe5',65);
 pdfText(a,54,70,8,p.id+'  /  '+p.format.toUpperCase(),true,'#8291a3',50);pages.push(a.join('\n'));
 // 02 - Start here
 a=pdfHeader('Start here',2);y=pdfText(a,44,690,24,p.title,true,'#101827',36);y=pdfText(a,44,y-10,10,p.description,false,'#64748b',92);
 pdfRect(a,44,506,524,82,'#f5f7fa','#e1e6ed');pdfText(a,60,565,8,'THE OUTCOME',true,'#c56b45',30);pdfText(a,60,543,10,p.outcome,false,'#26384d',88);
 pdfText(a,44,470,12,'HOW TO USE THIS RESOURCE',true,'#101827',50);
 p.steps.forEach((s,i)=>{const yy=414-i*64;pdfRect(a,44,yy-28,524,48,'#fbfcfd','#e1e6ed');pdfText(a,59,yy+2,8,'0'+(i+1),true,'#c56b45',5);pdfText(a,92,yy+3,9,s,true,'#26384d',76);});
 pdfText(a,44,145,10,'BEFORE YOU BEGIN',true,'#101827',40);
 ['Set aside a short, focused session.','Keep the information you need nearby.','Use the notes area to record decisions and follow-ups.'].forEach((s,i)=>{pdfRect(a,46,116-i*22,9,9,null,'#c56b45');pdfText(a,63,118-i*22,8,s,false,'#64748b',76);});
 pages.push(a.join('\n'));
 // 03 - Method
 a=pdfHeader('The method',3);pdfText(a,44,690,23,'The four-step method',true,'#101827',40);pdfText(a,44,660,10,'A focused sequence designed around this specific task.',false,'#64748b',90);
 p.steps.forEach((s,i)=>{const yy=535-i*119;pdfRect(a,44,yy-70,524,94,'#f7f8fa','#e1e6ed');pdfRect(a,44,yy-70,5,94,'#f07845');pdfText(a,65,yy+1,8,'STEP 0'+(i+1),true,'#c56b45',20);pdfText(a,65,yy-24,11,s,true,'#172a43',68);pdfText(a,65,yy-48,8,'Keep the action specific; note the evidence and the next decision.',false,'#718096',78);});
 pages.push(a.join('\n'));
 // 04 - Worksheet (same questions shown in the product thumbnail)
 a=pdfHeader('Guided worksheet',4);pdfText(a,44,690,23,'Guided worksheet',true,'#101827',40);pdfText(a,44,660,9,'Use these prompts to turn the plan into specific decisions and next actions.',false,'#64748b',88);
 p.prompts.forEach((q,i)=>{const yy=535-i*122;pdfRect(a,44,yy-83,524,105,'#fbfcfd','#dfe5ec');pdfRect(a,60,yy-1,23,23,'#f07845');pdfText(a,67,yy+7,9,String(i+1),true,'#101827',2);pdfText(a,96,yy+7,9,q,true,'#26384d',72);pdfLine(a,96,yy-47,548,yy-47,'#cbd4df',0.7);pdfLine(a,96,yy-67,548,yy-67,'#cbd4df',0.7);});
 pages.push(a.join('\n'));
 // 05 - Tracker
 a=pdfHeader('Reusable tracker',5);pdfText(a,44,690,23,'Your working tracker',true,'#101827',40);pdfText(a,44,660,9,'Use one row per item, task, decision or review point. Add dates where useful.',false,'#64748b',92);
 const tx=44,tw=524,cw=131,top=590,hh=42,rh=68;pdfRect(a,tx,top-hh,tw,hh,'#172a43');
 p.tracker.forEach((h,i)=>pdfText(a,tx+8+i*cw,top-25,8,h,true,'#ffffff',18));
 for(let r=0;r<5;r++){const yy=top-hh-(r+1)*rh;pdfRect(a,tx,yy,tw,rh,'#ffffff','#dfe5ec');for(let c=1;c<4;c++)pdfLine(a,tx+c*cw,yy,tx+c*cw,yy+rh,'#dfe5ec',0.7);pdfText(a,tx+9,yy+rh/2+3,8,'ENTRY 0'+(r+1),false,'#8291a3',14);}
 pdfText(a,44,157,9,'TRACKING NOTE',true,'#c56b45',30);pdfText(a,44,135,9,'Record facts consistently. Review the pattern before changing the plan.',false,'#64748b',90);
 pages.push(a.join('\n'));
 // 06 - 30-day plan
 a=pdfHeader('30-day implementation',6);pdfText(a,44,690,23,'A month of practical progress',true,'#101827',42);pdfText(a,44,660,9,'Use each week to complete one part of the process and capture what you learn.',false,'#64748b',90);
 p.steps.forEach((s,i)=>{const yy=535-i*112;pdfRect(a,44,yy-67,524,86,'#f7f8fa','#e1e6ed');pdfText(a,60,yy-2,8,'WEEK 0'+(i+1),true,'#c56b45',18);pdfText(a,60,yy-27,9,s,true,'#26384d',75);pdfText(a,60,yy-49,8,'Done when the action is recorded and the next step is clear.',false,'#718096',78);});
 pdfText(a,44,82,9,'END-OF-MONTH REVIEW',true,'#101827',50);pdfText(a,44,63,8,'What improved?  What remains unclear?  What is the next useful action?',false,'#64748b',95);
 pages.push(a.join('\n'));
 const objs=[];
 objs.push('<< /Type /Catalog /Pages 2 0 R >>');
 const kids=pages.map((_,i)=>(5+i*2)+' 0 R').join(' ');
 objs.push('<< /Type /Pages /Kids ['+kids+'] /Count '+pages.length+' >>');
 objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 pages.forEach((stream,i)=>{const pageId=5+i*2,contentId=pageId+1;objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>');objs.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');});
 let pdf='%PDF-1.4\n',offsets=[0];objs.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
 const xref=pdf.length;pdf+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([pdf],{type:'application/pdf'});
}
function downloadGeneratedProduct(id){const p=products.find(x=>x.id===id);if(!p||!p.generatedEdition)return;const url=URL.createObjectURL(buildGeneratedPdf(p)),a=document.createElement('a');a.href=url;a.download=p.slug+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast.textContent='Your PDF is being prepared.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2400);}

function card(p){
 const bg=colours[p.categoryKey]||'#172a43';
 const visual=p.previewImage?'<div class="product-page-preview"><img src="'+esc(p.previewImage)+'" alt="Actual interior worksheet page from '+esc(p.title)+'" loading="lazy"><span>INTERIOR PAGE / 04</span></div>':'<div class="product-cover" style="--cover-bg:'+bg+'"><div class="cover-top"><span>CAREERPILOT DIGITAL</span><span>PDF / '+String(p.pages||6).padStart(2,'0')+'P</span></div><div class="cover-middle"><span class="cover-category">'+esc(p.category)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.format)+' / Practical working edition</p></div><div class="cover-bottom"><span>'+esc(p.id)+'</span><span>'+((p.original)?'ORIGINAL PLANNER':'DIGITAL EDITION')+'</span></div></div>';
 const download=p.generatedEdition?'<button type="button" data-download-product="'+esc(p.id)+'">Download PDF <span aria-hidden="true">↓</span></button>':'<a href="'+esc(p.file)+'" download>Download PDF <span aria-hidden="true">↓</span></a>';
 return '<article class="product-card">'+visual+'<div class="product-card-body"><div class="product-meta"><span class="product-category">'+esc(p.category)+'</span><span class="product-format">'+esc(p.format)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p><div class="product-card-actions"><button type="button" data-preview="'+esc(p.id)+'">Read online <span aria-hidden="true">↗</span></button>'+download+'</div></div></article>';
}
function render(){const list=matching(),shown=list.slice(0,visible);grid.innerHTML=shown.map(card).join('');count.textContent='Showing '+shown.length+' of '+list.length+' products';empty.hidden=list.length!==0;grid.hidden=list.length===0;more.hidden=shown.length>=list.length;more.textContent='Load more products ('+Math.max(0,list.length-shown.length)+' remaining) ↓';}

function showProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 if(activeReaderUrl){URL.revokeObjectURL(activeReaderUrl);activeReaderUrl=null;}
 const noteKey='careerpilot:reader-notes:'+p.id;
 const file=p.generatedEdition?(activeReaderUrl=URL.createObjectURL(buildGeneratedPdf(p))):p.file;
 const safeFile=esc(file);
 dialogContent.innerHTML='<div class="reader-shell">'+
 '<header class="reader-heading"><div class="reader-heading-copy"><p class="eyebrow"><span></span> ONLINE READER / '+esc(p.category)+'</p><h2 id="dialog-title">'+esc(p.title)+'</h2><p class="reader-subtitle">'+esc(p.format)+' · '+esc(p.pages||6)+' pages · Read in your browser before downloading</p></div>'+
 '<div class="reader-actions"><a class="reader-open-link" href="'+safeFile+'" target="_blank" rel="noopener noreferrer">Open in new tab ↗</a><a class="button button-orange" href="'+safeFile+'" download="'+esc(p.slug)+'.pdf">Download PDF ↓</a></div></header>'+
 '<div class="reader-layout"><section class="reader-document" aria-label="PDF document preview"><div class="reader-document-bar"><span>DOCUMENT PREVIEW</span><span>Use the PDF toolbar to move between pages and zoom</span></div><iframe class="reader-frame" src="'+safeFile+'#toolbar=1&amp;navpanes=0&amp;view=FitH" title="Read '+esc(p.title)+' in browser" loading="eager"></iframe><p class="reader-fallback">If the document does not appear here, <a href="'+safeFile+'" target="_blank" rel="noopener noreferrer">open the PDF in a new browser tab</a>.</p></section>'+
 '<aside class="reader-workspace"><p class="eyebrow"><span></span> WORK ALONG</p><h3>Your notes</h3><p class="workspace-help">Write answers, ideas and next steps while you read. Notes are saved locally in this browser and are separate from the original PDF.</p><textarea class="reader-notes" id="reader-notes" aria-label="Your notes for '+esc(p.title)+'" placeholder="Start writing your answers, ideas or action steps here..."></textarea><p class="notes-status" id="notes-status" role="status" aria-live="polite">Your notes stay on this device.</p><div class="notes-actions"><button type="button" class="notes-download" id="download-notes">Download notes</button><button type="button" class="notes-clear" id="clear-notes">Clear</button></div><p class="workspace-footnote">The PDF is read-only in this preview. Download it if you want a separate copy to annotate with a PDF editor.</p></aside></div></div>';
 dialog.showModal();
 const notes=$('#reader-notes'),status=$('#notes-status'),downloadNotes=$('#download-notes'),clearNotes=$('#clear-notes');
 let saved='';try{saved=localStorage.getItem(noteKey)||'';}catch(e){saved='';}
 notes.value=saved;
 function updateNoteStatus(message){status.textContent=message;downloadNotes.disabled=!notes.value.trim();}
 updateNoteStatus(saved?'Saved in this browser':'Nothing saved yet');
 notes.addEventListener('input',()=>{try{if(notes.value.trim())localStorage.setItem(noteKey,notes.value);else localStorage.removeItem(noteKey);updateNoteStatus('Saved in this browser');}catch(e){updateNoteStatus('Browser storage is unavailable. Download your notes to keep a copy.');}});
 downloadNotes.addEventListener('click',()=>{const text=p.title+'\n'+p.category+'\n\n'+notes.value+'\n';const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(p.slug||p.id.toLowerCase())+'-notes.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 clearNotes.addEventListener('click',()=>{if(!notes.value)return;if(!window.confirm('Clear the notes saved for this product in this browser?'))return;notes.value='';try{localStorage.removeItem(noteKey);updateNoteStatus('Notes cleared.');}catch(e){updateNoteStatus('Notes cleared for this session.');}});
}
function closeReader(){dialogContent.innerHTML='';if(activeReaderUrl){URL.revokeObjectURL(activeReaderUrl);activeReaderUrl=null;}}
filterBox.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;active=b.dataset.filter;visible=24;filterBox.querySelectorAll('button').forEach(x=>{const yes=x===b;x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes));});render();});
search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();visible=24;render();});
sort.addEventListener('change',()=>{order=sort.value;visible=24;render();});
more.addEventListener('click',()=>{visible+=24;render();});
$('#reset-search').addEventListener('click',()=>{active='all';query='';order='featured';visible=24;search.value='';sort.value='featured';filterBox.querySelectorAll('button').forEach(x=>{const yes=x.dataset.filter==='all';x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes));});render();});
grid.addEventListener('click',e=>{const preview=e.target.closest('[data-preview]'),download=e.target.closest('[data-download-product]');if(preview)showProduct(preview.dataset.preview);if(download)downloadGeneratedProduct(download.dataset.downloadProduct);});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',closeReader);
document.querySelectorAll('[data-jump-category]').forEach(a=>a.addEventListener('click',()=>{const key=a.dataset.jumpCategory;const b=filterBox.querySelector('[data-filter="'+key+'"]');if(b)b.click();}));
const menu=$('#menu-toggle'),mobile=$('#mobile-nav');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');mobile.hidden=!open;});mobile.addEventListener('click',e=>{if(e.target.closest('a')){mobile.hidden=true;menu.setAttribute('aria-expanded','false');}});
let toastTimer;document.addEventListener('click',e=>{const a=e.target.closest('a[download]');if(!a)return;toast.textContent='Your download is starting.';toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400);});
fetch('/products/catalog.json').then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json();}).then(data=>{products=data.products||[];buildFilters(data.categories||[]);render();}).catch(()=>{count.textContent='The product library could not be loaded. Please refresh the page.';grid.innerHTML='';});
})();
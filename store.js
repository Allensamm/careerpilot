(() => {
'use strict';
const $=s=>document.querySelector(s);
const grid=$('#product-grid'),filterBox=$('#category-filter'),search=$('#product-search'),sort=$('#product-sort'),count=$('#product-count'),more=$('#load-more'),empty=$('#empty-state'),dialog=$('#product-dialog'),dialogContent=$('#dialog-content'),toast=$('#toast');
const colours={business:'#142b43',productivity:'#344a5d',marketing:'#5b3038',finance:'#1f4a3d',freelance:'#443653',career:'#263e5c',personal:'#66503f',creator:'#57365a',operations:'#2c4b49'};
let products=[],active='all',query='',order='featured',visible=24;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildFilters(categories){filterBox.innerHTML='<button type="button" data-filter="all" class="active" aria-pressed="true">All products <span>'+products.length+'</span></button>'+categories.map(c=>'<button type="button" data-filter="'+esc(c.key)+'" aria-pressed="false">'+esc(c.label)+' <span>'+c.count+'</span></button>').join('');}
function matching(){let list=products.filter(p=>(active==='all'||p.categoryKey===active)&&(!query||[p.title,p.category,p.format,p.description,...(p.tags||[])].join(' ').toLowerCase().includes(query)));if(order==='az')list.sort((a,b)=>a.title.localeCompare(b.title));else if(order==='category')list.sort((a,b)=>a.category.localeCompare(b.category)||a.title.localeCompare(b.title));else list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)||(a.original?-1:0)-(b.original?-1:0)||a.title.localeCompare(b.title));return list;}
function card(p){const bg=colours[p.categoryKey]||'#172a43';return '<article class="product-card"><div class="product-cover" style="--cover-bg:'+bg+'"><div class="cover-top"><span>CAREERPILOT DIGITAL</span><span>PDF / '+String(p.pages||6).padStart(2,'0')+'P</span></div><div class="cover-middle"><span class="cover-category">'+esc(p.category)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.format)+' / Practical working edition</p></div><div class="cover-bottom"><span>'+esc(p.id)+'</span><span>'+((p.original)?'ORIGINAL PLANNER':'DIGITAL EDITION')+'</span></div></div><div class="product-card-body"><div class="product-meta"><span class="product-category">'+esc(p.category)+'</span><span class="product-format">'+esc(p.format)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p><div class="product-card-actions"><button type="button" data-preview="'+esc(p.id)+'">Read online <span aria-hidden="true">↗</span></button><a href="'+esc(p.file)+'" download>Download PDF <span aria-hidden="true">↓</span></a></div></div></article>';}
function render(){const list=matching(),shown=list.slice(0,visible);grid.innerHTML=shown.map(card).join('');count.textContent='Showing '+shown.length+' of '+list.length+' products';empty.hidden=list.length!==0;grid.hidden=list.length===0;more.hidden=shown.length>=list.length;more.textContent='Load more products ('+Math.max(0,list.length-shown.length)+' remaining) ↓';}
function showProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 const noteKey='careerpilot:reader-notes:'+p.id;
 const file=esc(p.file);
 dialogContent.innerHTML='<div class="reader-shell">'+
 '<header class="reader-heading"><div class="reader-heading-copy"><p class="eyebrow"><span></span> ONLINE READER / '+esc(p.category)+'</p><h2 id="dialog-title">'+esc(p.title)+'</h2><p class="reader-subtitle">'+esc(p.format)+' · '+esc(p.pages||6)+' pages · Read in your browser before downloading</p></div>'+
 '<div class="reader-actions"><a class="reader-open-link" href="'+file+'" target="_blank" rel="noopener noreferrer">Open in new tab ↗</a><a class="button button-orange" href="'+file+'" download>Download PDF ↓</a></div></header>'+
 '<div class="reader-layout"><section class="reader-document" aria-label="PDF document preview"><div class="reader-document-bar"><span>DOCUMENT PREVIEW</span><span>Use the PDF toolbar to zoom, search and navigate</span></div><iframe class="reader-frame" src="'+file+'#toolbar=1&amp;navpanes=0&amp;view=FitH" title="Read '+esc(p.title)+' in browser" loading="eager"></iframe><p class="reader-fallback">If the document does not appear here, <a href="'+file+'" target="_blank" rel="noopener noreferrer">open the PDF in a new browser tab</a>.</p></section>'+
 '<aside class="reader-workspace"><p class="eyebrow"><span></span> WORK ALONG</p><h3>Your notes</h3><p class="workspace-help">Write answers, ideas and next steps while you read. Notes are saved locally in this browser and are separate from the original PDF.</p><textarea class="reader-notes" id="reader-notes" aria-label="Your notes for '+esc(p.title)+'" placeholder="Start writing your answers, ideas or action steps here..."></textarea><p class="notes-status" id="notes-status" role="status" aria-live="polite">Your notes stay on this device.</p><div class="notes-actions"><button type="button" class="notes-download" id="download-notes">Download notes</button><button type="button" class="notes-clear" id="clear-notes">Clear</button></div><p class="workspace-footnote">The PDF is read-only in this preview. Download it if you want a separate copy to annotate with a PDF editor.</p></aside></div></div>';
 dialog.showModal();
 const notes=$('#reader-notes'),status=$('#notes-status'),downloadNotes=$('#download-notes'),clearNotes=$('#clear-notes');
 let saved='';
 try{saved=localStorage.getItem(noteKey)||'';}catch(e){saved='';}
 notes.value=saved;
 function updateNoteStatus(message){status.textContent=message;downloadNotes.disabled=!notes.value.trim();}
 updateNoteStatus(saved?'Saved in this browser':'Nothing saved yet');
 notes.addEventListener('input',()=>{
   try{if(notes.value.trim())localStorage.setItem(noteKey,notes.value);else localStorage.removeItem(noteKey);updateNoteStatus('Saved in this browser');}
   catch(e){updateNoteStatus('Browser storage is unavailable. Download your notes to keep a copy.');}
 });
 downloadNotes.addEventListener('click',()=>{
   const text=p.title+'\n'+p.category+'\n\n'+notes.value+'\n';
   const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=(p.slug||p.id.toLowerCase())+'-notes.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 clearNotes.addEventListener('click',()=>{
   if(!notes.value)return;
   if(!window.confirm('Clear the notes saved for this product in this browser?'))return;
   notes.value='';try{localStorage.removeItem(noteKey);updateNoteStatus('Notes cleared.');}catch(e){updateNoteStatus('Notes cleared for this session.');}
 });
}
function closeReader(){dialogContent.innerHTML='';}
filterBox.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;active=b.dataset.filter;visible=24;filterBox.querySelectorAll('button').forEach(x=>{const yes=x===b;x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes));});render();});
search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();visible=24;render();});
sort.addEventListener('change',()=>{order=sort.value;visible=24;render();});
more.addEventListener('click',()=>{visible+=24;render();});
$('#reset-search').addEventListener('click',()=>{active='all';query='';order='featured';visible=24;search.value='';sort.value='featured';filterBox.querySelectorAll('button').forEach(x=>{const yes=x.dataset.filter==='all';x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes));});render();});
grid.addEventListener('click',e=>{const b=e.target.closest('[data-preview]');if(b)showProduct(b.dataset.preview);});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',closeReader);
document.querySelectorAll('[data-jump-category]').forEach(a=>a.addEventListener('click',()=>{const key=a.dataset.jumpCategory;const b=filterBox.querySelector('[data-filter="'+key+'"]');if(b)b.click();}));
const menu=$('#menu-toggle'),mobile=$('#mobile-nav');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');mobile.hidden=!open;});mobile.addEventListener('click',e=>{if(e.target.closest('a')){mobile.hidden=true;menu.setAttribute('aria-expanded','false');}});
let toastTimer;document.addEventListener('click',e=>{const a=e.target.closest('a[download]');if(!a)return;toast.textContent='Your download is starting.';toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400);});
fetch('/products/catalog.json').then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json();}).then(data=>{products=data.products||[];buildFilters(data.categories||[]);render();}).catch(()=>{count.textContent='The product library could not be loaded. Please refresh the page.';grid.innerHTML='';});
})();
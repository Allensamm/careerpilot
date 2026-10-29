// Progressive enhancement only. Existing encrypted vault logic remains in app.mjs.
const icons={"search":"<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m16 16 5 5\"/>","lock":"<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/>","user":"<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>","home":"<path d=\"m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z\"/>","grid":"<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/>","spark":"<path d=\"m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z\"/>","file":"<path d=\"M7 3h7l5 5v13H7z\"/><path d=\"M14 3v6h5M10 14h6M10 17h6\"/>"};
function svg(name){const holder=document.createElement('span');holder.innerHTML='<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';return holder.firstChild;}
function replaceIcon(node,name){if(!node)return;node.replaceChildren(svg(name));}
replaceIcon(document.querySelector('.top-actions a[href="#vault"]'),'lock');
replaceIcon(document.querySelector('.top-actions a[href="#profile"]'),'user');
replaceIcon(document.querySelector('.empty-symbol'),'search');
replaceIcon(document.querySelector('.upload-illustration'),'file');
const bottom=document.querySelectorAll('.mobile-bottom a');const names=['home','search','grid','user','lock'];bottom.forEach((a,i)=>{const first=a.firstChild;if(first?.nodeType===Node.TEXT_NODE)first.remove();a.prepend(svg(names[i]));});
const search=document.getElementById('searchJobs');if(search){search.replaceChildren(svg('search'),document.createTextNode(' Search'));}
const notice=document.getElementById('uiNotice');let noticeTimer;
function inform(message){notice.textContent=message;notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.hidden=true,5200);}
function active(){const hash=location.hash||'#discover';document.querySelectorAll('.toplinks a,.mobile-bottom a').forEach(a=>{const selected=a.getAttribute('href')===hash;a.classList.toggle('selected',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
function lockedTarget(target){return ['#matches','#profile','#agent','#cloud'].includes(target)&&document.getElementById('workspace')?.hidden;}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=a.getAttribute('href');if(lockedTarget(target)){e.preventDefault();inform('Unlock your encrypted vault to use this workspace section.');document.getElementById('vault')?.scrollIntoView({behavior:'smooth'});history.replaceState(null,'','#vault');active();}}));
window.addEventListener('hashchange',active);active();
if(location.hash&&lockedTarget(location.hash)){history.replaceState(null,'','#vault');inform('Unlock your encrypted vault first.');document.getElementById('vault')?.scrollIntoView();}

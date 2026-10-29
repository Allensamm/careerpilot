import * as agent from './agent.mjs';
import {extractSkills,scoreJob,normalizeGreenhouse} from './core.mjs';
import {vaultExists,createVault,unlockVault,lockVault,isUnlocked,vaultGet,vaultSet,deleteVault,exportEncryptedVault,importEncryptedVault} from './vault.mjs';
const $=id=>document.getElementById(id);let jobs=[];
function message(id,s){$(id).textContent=s;}
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function requireVault(){if(!isUnlocked())throw Error('Unlock your vault first');}
function showLock(){const unlocked=isUnlocked();$('workspace').hidden=!unlocked;$('vaultControls').hidden=unlocked;$('vaultActive').hidden=!unlocked;message('vaultStatus',unlocked?'Vault unlocked locally. Lock when finished.':'Your CV and profile are encrypted at rest.');}
async function render(){showLock();if(!isUnlocked())return;const p=await vaultGet('profile'),policy=await vaultGet('policy');jobs=await vaultGet('jobs')||[];if(p){$('cvtext').value=p.cv||'';$('role').value=p.role||'';$('region').value=p.region||'';$('verified').checked=!!p.verified;$('skills').textContent=(p.skills||[]).join(' · ');}if(policy){$('threshold').value=policy.threshold;$('autopilot').checked=!!policy.enabled;}renderJobs(p);}
function renderJobs(p){const root=$('jobs');root.replaceChildren();$('count').textContent=`(${jobs.length})`;if(!jobs.length){root.append(el('p','No jobs loaded yet.'));return;}const threshold=Number($('threshold').value)||0;for(const j of jobs.slice(0,100)){const s=scoreJob(p||{},j),card=el('article');card.className='job';const link=el('a','Open original job');link.href=j.url;link.target='_blank';link.rel='noopener noreferrer';card.append(el('h3',j.title),el('p',`${j.company} · ${j.location} · Match ${s.score}%`),el('p',`Eligibility: unknown · ${s.matched.length} matched skills`),link);if(s.score>=threshold)card.classList.add('strong');root.append(card);}}
$('create').onclick=async()=>{try{await createVault($('passphrase').value);$('passphrase').value='';await render();}catch(e){message('vaultStatus',e.message);}};
$('unlock').onclick=async()=>{try{await unlockVault($('passphrase').value);$('passphrase').value='';await render();}catch(e){message('vaultStatus',e.message);}};
$('lock').onclick=()=>{lockVault();$('cvtext').value='';$('skills').textContent='';jobs=[];showLock();};
$('cv').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!f.name.toLowerCase().endsWith('.txt')||f.size>2_000_000){message('profileStatus','Browser accepts TXT up to 2MB. Use local desktop parser for PDF/DOCX.');return;}$('cvtext').value=await f.text();message('profileStatus','CV loaded in memory. Save to encrypt it in your vault.');};
$('save').onclick=async()=>{try{requireVault();const cv=$('cvtext').value;if(cv.length>200000)throw Error('CV text too long');const p={cv,role:$('role').value.trim(),region:$('region').value.trim(),verified:$('verified').checked,skills:extractSkills(cv),updatedAt:new Date().toISOString()};await vaultSet('profile',p);message('profileStatus',`Encrypted locally. ${p.skills.length} skills detected.`);$('skills').textContent=p.skills.join(' · ');renderJobs(p);}catch(e){message('profileStatus',e.message);}};
$('sync').onclick=async()=>{try{requireVault();const board=$('board').value.trim();if(!/^[a-zA-Z0-9_-]{2,80}$/.test(board))throw Error('Invalid board token');message('syncStatus','Fetching public listings…');const res=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,{credentials:'omit',referrerPolicy:'no-referrer'});if(!res.ok)throw Error(`Feed returned ${res.status}`);const incoming=normalizeGreenhouse(await res.json(),board);jobs=[...new Map([...jobs,...incoming].map(j=>[j.id,j])).values()];await vaultSet('jobs',jobs);message('syncStatus',`Encrypted ${incoming.length} imported jobs locally.`);renderJobs(await vaultGet('profile'));}catch(e){message('syncStatus',`Unable to sync: ${e.message}`);}};
$('policySave').onclick=async()=>{try{requireVault();const threshold=Number($('threshold').value);if(!Number.isInteger(threshold)||threshold<0||threshold>100)throw Error('Invalid threshold');await vaultSet('policy',{enabled:$('autopilot').checked,threshold});message('syncStatus','Encrypted local planning policy saved. Real submission disabled.');renderJobs(await vaultGet('profile'));}catch(e){message('syncStatus',e.message);}};
$('export').onclick=async()=>{try{const blob=new Blob([await exportEncryptedVault()],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='careerpilot-encrypted-vault.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){message('vaultStatus',e.message);}};
$('importFile').onchange=async e=>{try{const f=e.target.files?.[0];if(!f)return;if(f.size>5_000_000)throw Error('Export too large');await importEncryptedVault(await f.text());message('vaultStatus','Encrypted vault imported. Unlock using its original passphrase.');}catch(err){message('vaultStatus',err.message);}};
$('delete').onclick=async()=>{if(!confirm('Permanently delete the encrypted vault on this browser? Export a backup first if needed.'))return;await deleteVault();location.reload();};
showLock();vaultExists().then(x=>message('vaultStatus',x?'Existing vault found. Enter your passphrase to unlock.':'Create a vault using a strong passphrase (12+ characters).')).catch(e=>message('vaultStatus',e.message));

const agentStatus=$('agentStatus');
$('agentCheck').onclick=async()=>{try{const h=await agent.health();agentStatus.textContent=`Local agent running (v${h.version}). Submissions disabled.`;}catch(e){agentStatus.textContent=`Agent unavailable: ${e.message}`;}};
$('agentPair').onclick=async()=>{try{requireVault();await agent.pair($('agentCode').value.trim());$('agentCode').value='';agentStatus.textContent='Paired for this browser tab only. No CV or profile transferred.';}catch(e){agentStatus.textContent=e.message;}};
$('agentQueue').onclick=async()=>{try{requireVault();if(!agent.isPaired())throw Error('Pair the agent first');const id=$('agentJob').value.trim();await agent.queueJob(id);const q=await agent.listQueue();agentStatus.textContent=`${q.jobs.length} public job ID(s) queued in agent memory. No applications submitted.`;}catch(e){agentStatus.textContent=e.message;}};
$('agentUnpair').onclick=async()=>{await agent.unpair();agentStatus.textContent='Unpaired and agent queue cleared.';};

// Cloud package opt-in: credentials are saved only in the encrypted local vault.
const cloudMsg=s=>message('cloudMessage',s);
$('cloudCreate').onclick=async()=>{try{
  requireVault();if(!$('cloudConsent').checked)throw Error('Explicit consent is required');
  const profile=await vaultGet('profile');if(!profile?.verified)throw Error('Save and verify your local profile first');
  const name=$('cloudName').value.trim(),email=$('cloudEmail').value.trim();
  if(!name||!email.includes('@'))throw Error('Enter a name and email');
  const old=await vaultGet('cloudPackage');if(old)throw Error('Revoke the existing cloud package first');
  const board=$('board').value.trim();
  if(!/^[a-zA-Z0-9_-]{2,80}$/.test(board))throw Error('Enter a valid Greenhouse board token for cloud discovery');
  const body={consent:true,name,email,role:profile.role,region:profile.region||'',skills:profile.skills||[],boards:[board]};
  const response=await fetch('/api/cloud/packages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw Error(data.detail||'Cloud unavailable');
  try{await vaultSet('cloudPackage',{id:data.id,token:data.management_token,expiresAt:data.expires_at});}
  catch(err){await fetch(`/api/cloud/packages/${data.id}`,{method:'DELETE',headers:{'X-Management-Token':data.management_token}}).catch(()=>{});throw err;}
  cloudMsg('Encrypted discovery package created. Worker can search while your phone is off. No applications submitted. Expires within 24 hours.');
}catch(e){cloudMsg(e.message);}};
$('cloudStatus').onclick=async()=>{try{requireVault();const p=await vaultGet('cloudPackage');if(!p)throw Error('No local package reference');const r=await fetch(`/api/cloud/packages/${p.id}`,{headers:{'X-Management-Token':p.token}});const d=await r.json();if(!r.ok)throw Error(d.detail||'Unavailable');cloudMsg(`Status: ${d.status}. ${d.matches?.length||0} preliminary matches. ${d.note}`);const list=$('cloudMatches');if(list){list.replaceChildren();for(const job of (d.matches||[]).slice(0,30)){const item=el('article');item.className='job';item.append(el('h3',job.title||'Untitled job'));item.append(el('p',`${job.board||'Public board'} · ${job.status||'Review required'}`));if(typeof job.url==='string'&&job.url.startsWith('https://')){const link=el('a','View original listing ↗');link.href=job.url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);}list.append(item);}if(!d.matches?.length)list.append(el('p','No cloud matches yet. Discovery runs on a schedule once configured.'));}}catch(e){cloudMsg(e.message);}};
$('cloudRevoke').onclick=async()=>{try{requireVault();const p=await vaultGet('cloudPackage');if(!p)throw Error('No local package reference');const r=await fetch(`/api/cloud/packages/${p.id}`,{method:'DELETE',headers:{'X-Management-Token':p.token}});if(!r.ok)throw Error((await r.json()).detail||'Revocation failed');await vaultSet('cloudPackage',null);cloudMsg('Cloud package deleted. Local CV remains in your vault.');}catch(e){cloudMsg(e.message);}};

const simpleFind=document.getElementById('simpleFind');
if(simpleFind)simpleFind.onclick=async()=>{
 const status=document.getElementById('simpleStatus'),root=document.getElementById('simpleResults');
 root.replaceChildren();
 const file=document.getElementById('simpleCv').files?.[0];
 if(!file||!/\.(pdf|docx|txt)$/i.test(file.name)){status.textContent='Please select a PDF, Word (.docx), or TXT résumé.';return;}
 if(file.size>2000000){status.textContent='File must be under 2 MB.';return;}
 simpleFind.disabled=true;status.textContent='Finding relevant public jobs…';
 try{
  const upload=new FormData();upload.append('file',file);const extraction=await fetch('/api/cv/extract',{method:'POST',body:upload});const parsed=await extraction.json();if(!extraction.ok)throw Error(parsed.detail||'Could not read CV');const cv=parsed.text,skills=extractSkills(cv);
  const boards=['stripe','gitlab','cloudflare','datadog','figma','notion','reddit','airbnb','coinbase','mongodb','elastic','plaid','asana','brex','webflow','zapier','canonical','automattic','sourcegraph','vercel'];
  const batches=await Promise.allSettled(boards.map(async board=>{
   const response=await fetch('https://boards-api.greenhouse.io/v1/boards/'+board+'/jobs');
   if(!response.ok)throw Error('Board unavailable');
   return normalizeGreenhouse(await response.json(),board);
  }));
  const found=batches.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
  const profile={cv,skills,role:'',region:''};
  const ranked=found.map(job=>({...job,match:scoreJob(profile,job)})).filter(j=>j.match.score>0).sort((a,b)=>b.match.score-a.match.score).slice(0,36);
  status.textContent=ranked.length+' potential matches from '+found.length+' public listings. Scores are indicative, not hiring eligibility.';
  for(const job of ranked){
   const card=el('article');card.className='job';
   const link=el('a','View & Apply');link.href=job.url;link.target='_blank';link.rel='noopener noreferrer';
   card.append(el('h3',job.title),el('p',job.company+' · '+job.location+' · Match '+job.match.score+'%'),link);root.append(card);
  }
  if(!ranked.length)root.append(el('p','No verified matches from the sources checked. Try broadening the role or location, or search again later. We will never invent job listings.'));
 }catch(error){status.textContent='Search failed: '+error.message;}
 finally{simpleFind.disabled=false;}
};

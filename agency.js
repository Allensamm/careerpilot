(()=>{const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');if(menu&&nav)menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});const currentPath=location.pathname.replace(/\\/$/,'')||'/';document.querySelectorAll('.nav a').forEach(a=>{const href=a.getAttribute('href')||'';if(href.startsWith('/')&&!href.includes('#')){if(href===currentPath)a.setAttribute('aria-current','page');else if(href!=='/')a.removeAttribute('aria-current');}});const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!reduced)document.documentElement.classList.add('js-motion');const reveal=()=>{const els=[...document.querySelectorAll('.reveal')];if(!('IntersectionObserver'in window)){els.forEach(e=>{e.style.opacity=1;e.style.transform='none'});return;}const obs=new IntersectionObserver(entries=>entries.forEach(x=>{if(x.isIntersecting){if(!reduced&&window.gsap)gsap.to(x.target,{opacity:1,y:0,duration:.75,ease:'power2.out'});else{x.target.style.opacity=1;x.target.style.transform='none'}obs.unobserve(x.target)}}),{threshold:.12});els.forEach(e=>obs.observe(e));};if(!reduced&&window.gsap){gsap.from('.hero-copy > *',{opacity:0,y:22,duration:.8,stagger:.1,ease:'power2.out'});gsap.from('.hero-art',{opacity:0,scale:.96,duration:1,ease:'power2.out',delay:.2});gsap.to('.art-orbit',{rotation:360,duration:90,repeat:-1,ease:'none'});}reveal();const form=document.querySelector('#enquiry-form');if(form){form.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());const body=['New CareerPilot enquiry','',...Object.entries(data).map(([k,v])=>k+': '+v)].join('\n');const status=form.querySelector('.form-status');const recipient=window.CAREERPILOT_CONTACT_EMAIL||'';if(recipient){location.href='mailto:'+encodeURIComponent(recipient)+'?subject='+encodeURIComponent('Website enquiry — '+data.service)+'&body='+encodeURIComponent(body);status.textContent='Your email application is opening with your enquiry details.';}else{try{await navigator.clipboard.writeText(body);status.textContent='Your enquiry details have been copied. The agency email address still needs to be configured before this form can send directly.';}catch(_){status.textContent='Please copy your enquiry details and send them using the agency contact address.';}}});}})();
/* CareerPilot free CV readiness checklist */
const cvChecks=[...document.querySelectorAll('.cv-check')];
if(cvChecks.length){
 const score=document.querySelector('#cv-score');
 const feedback=document.querySelector('#cv-feedback');
 const updateScore=()=>{
  const count=cvChecks.filter(x=>x.checked).length;
  if(score)score.textContent=count+' of '+cvChecks.length+' reviewed';
  if(feedback)feedback.textContent=count===cvChecks.length?'All checklist items reviewed. Give your CV one final read before sending.':count>=5?'Good progress. Review the remaining items and check the CV against each role.':count>=2?'You are building a useful review. Keep working through the checklist.':'Start with accuracy, relevance and a clear description of your experience.';
 };
 cvChecks.forEach(x=>x.addEventListener('change',updateScore));
 const reset=document.querySelector('#cv-reset');
 if(reset)reset.addEventListener('click',()=>{cvChecks.forEach(x=>x.checked=false);updateScore();});
 updateScore();
}

/* CareerPilot free tools — all processing stays in the visitor's browser */
(()=>{
 const $=id=>document.getElementById(id);
 const safe=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const words=s=>(s.toLowerCase().match(/[a-z][a-z'-]{2,}/g)||[]);
 const unique=a=>[...new Set(a)];
 const report=$("cv-report");
 const upload=$("cv-upload");
 const analyse=$("cv-analyse");
 if(analyse) analyse.addEventListener("click",async()=>{
  const file=upload&&upload.files&&upload.files[0];
  if(!file){report.innerHTML="<strong>Please choose a PDF or DOCX file first.</strong>";return;}
  const ext=file.name.toLowerCase().split(".").pop();
  if(!["pdf","docx"].includes(ext)){report.innerHTML="<strong>Unsupported file.</strong><p>Please upload a PDF or DOCX document.</p>";return;}
  report.innerHTML="<strong>Reviewing your document…</strong><p>Text is being extracted locally in your browser.</p>";
  try{
   let text="";
   const buffer=await file.arrayBuffer();
   if(ext==="pdf"){
    if(!window.pdfjsLib)throw new Error("The PDF reader could not load. Refresh the page and try again.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buffer)}).promise;
    for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n);const c=await pg.getTextContent();text+=c.items.map(x=>x.str).join(" ")+"\n";}
   }else{
    if(!window.mammoth)throw new Error("The DOCX reader could not load. Refresh the page and try again.");
    const result=await window.mammoth.extractRawText({arrayBuffer:buffer});text=result.value||"";
   }
   const low=text.toLowerCase(), ws=words(text), count=ws.length;
   const checks=[
    ["Contact information",/(email|@|phone|linkedin|www\.)/.test(low),"Include a professional email address and a suitable contact method."],
    ["Professional summary",/(summary|profile|professional statement|career objective)/.test(low),"Add a short, role-relevant professional summary."],
    ["Work experience",/(experience|employment|professional history|work history)/.test(low),"Make your employment history easy to locate."],
    ["Education",/(education|academic|university|college|degree|diploma)/.test(low),"Add relevant education or qualifications."],
    ["Skills",/(skills|competencies|technical|proficiencies)/.test(low),"Include a clearly labelled skills section."],
    ["Achievements and evidence",/(achieved|improved|increased|reduced|delivered|managed|created|led|saved|%)/.test(low),"Where possible, show outcomes, scope or measurable achievements."],
    ["Dates and role details",/(20[0-9]{2}|19[89][0-9])/.test(low),"Check that roles, employers and dates are clear and consistent."],
    ["Readable length",count>=180&&count<=1400,count<180?"The extracted text is very short; check whether the document is complete or add relevant detail.":"The document is quite long; consider prioritising the most relevant experience."]
   ];
   const score=checks.filter(x=>x[1]).length;
   const missing=checks.filter(x=>!x[1]);
   report.innerHTML="<strong>"+score+" of "+checks.length+" review checks passed</strong><p>"+count+" words extracted from "+safe(file.name)+". This is a content checklist, not a true ATS compatibility score.</p><h3>What looks present</h3><ul>"+checks.filter(x=>x[1]).map(x=>"<li>"+x[0]+"</li>").join("")+"</ul><h3>Suggested improvements</h3><ul>"+(missing.length?missing.map(x=>"<li><b>"+x[0]+":</b> "+x[2]+"</li>").join(""):"<li>Core sections were detected. Now check relevance, clarity and consistency against the role you want.</li>")+"</ul><p><b>Important:</b> Automated text extraction cannot reliably assess visual design, tables, columns, reading order or every ATS parser. Review the original document before applying.</p>";
  }catch(e){report.innerHTML="<strong>We couldn't read this document.</strong><p>"+safe(e.message)+"</p><p>Try exporting it again as a text-based PDF or a standard DOCX file.</p>";}
 });
 const liBtn=$("li-generate");
 if(liBtn)liBtn.addEventListener("click",()=>{
  const role=$("li-role").value.trim(),industry=$("li-industry").value.trim(),skills=$("li-skills").value.trim(),goal=$("li-goal").value.trim(),experience=$("li-experience").value.trim();
  if(!role||!skills){$("li-output").innerHTML="<p>Please add at least your target role and key strengths.</p>";return;}
  const skillList=skills.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  const headline=role+" | "+skillList.slice(0,3).join(" · ")+(industry?" | "+industry:"");
  const about="I am a "+role+(industry?" working in "+industry:"")+". My strengths include "+skillList.join(", ")+". "+(experience||"I bring a thoughtful, practical approach to solving problems and supporting team goals.")+" "+(goal?"I am currently focused on "+goal+".":"I am interested in connecting with people working on meaningful challenges in my field.")+"\n\nI value clear communication, continuous learning and delivering work that makes a practical difference.";
  const keywords=unique([role,industry,...skillList].filter(Boolean));
  const themes=["A lesson learned from a recent project","How you approach a common challenge in your field","A practical tip your colleagues or clients may find useful"];
  $("li-output").innerHTML="<div class='generated-block'><h3>Headline suggestion</h3><p>"+safe(headline)+"</p><button type='button' class='btn btn-light copy-tool' data-copy='li-head'>Copy headline</button><textarea id='li-head' rows='2'>"+safe(headline)+"</textarea></div><div class='generated-block'><h3>About section starting point</h3><textarea id='li-about' rows='7'>"+safe(about)+"</textarea><button type='button' class='btn btn-light copy-tool' data-copy='li-about'>Copy About section</button></div><div class='generated-block'><h3>Keyword ideas</h3><p>"+safe(keywords.join(" · "))+"</p></div><div class='generated-block'><h3>Content themes</h3><ul>"+themes.map(x=>"<li>"+x+"</li>").join("")+"</ul></div><p class='tool-privacy'>These are structured writing suggestions generated from your inputs, not AI research or a live LinkedIn audit. Verify every claim and only include skills and achievements you can substantiate.</p>";
 });
 document.addEventListener("click",async e=>{const b=e.target.closest(".copy-tool");if(b){const el=$(b.dataset.copy);if(el){el.select();try{await navigator.clipboard.writeText(el.value);b.textContent="Copied";}catch(_){b.textContent="Select and copy the text";}}}});
 const calc=$("calculate-time");
 if(calc)calc.addEventListener("click",()=>{
  const h=Number($("admin-hours").value),pct=Number($("delegate-share").value),weeks=Number($("work-weeks").value);
  if(!Number.isFinite(h)||!Number.isFinite(pct)||!Number.isFinite(weeks)||h<0||h>168||pct<0||pct>100||weeks<1||weeks>52){$("time-results").innerHTML="<p>Enter valid values within the ranges shown.</p>";return;}
  const weekly=h*pct/100,monthly=weekly*weeks/12,yearly=weekly*weeks;
  $("time-results").innerHTML="<div><strong>"+weekly.toFixed(1)+"</strong><span>Potential hours per week</span></div><div><strong>"+monthly.toFixed(1)+"</strong><span>Average hours per month</span></div><div><strong>"+yearly.toFixed(1)+"</strong><span>Potential hours per year</span></div>";
 });
 const ready=$("check-readiness");
 if(ready)ready.addEventListener("click",()=>{
  const ids=["jr-cv","jr-role","jr-tailor","jr-track","jr-linkedin","jr-interview"],labels=["Update and tailor your CV to a clearly defined target role.","Choose a realistic target role and identify the evidence employers ask for.","Adapt your experience and achievements to each relevant application.","Set up a simple tracker for roles, deadlines and follow-ups.","Refresh your LinkedIn headline, About section and experience.","Prepare specific examples that demonstrate your skills and impact."];
  const vals=ids.map(id=>Number($(id).value)),score=vals.reduce((a,b)=>a+b,0),pct=Math.round(score/12*100),todo=ids.map((id,i)=>({v:vals[i],label:labels[i]})).filter(x=>x.v<2);
  $("readiness-report").innerHTML="<strong>"+pct+"% readiness checklist score</strong><p>"+(score>=10?"You have a good foundation. Focus on tailoring and consistency.":score>=6?"You have some foundations in place. Strengthen the areas below before increasing application volume.":"Start with the fundamentals. A clearer target and stronger application materials will make the search more manageable.")+"</p><h3>Your suggested next steps</h3><ol>"+(todo.length?todo.map(x=>"<li>"+x.label+"</li>").join(""):"<li>Keep your materials current and review each application before submission.</li>")+"</ol><p class='tool-privacy'>This self-assessment is guidance, not a prediction of hiring outcomes.</p>";
 });
 const tasks=[];
 const planner=$("planner-list");
 const renderTasks=()=>{if(!planner)return;planner.innerHTML=tasks.length?tasks.map((t,i)=>"<div class='planner-item'><span><b>"+safe(t.name)+"</b><small>"+safe(t.owner||"Unassigned")+" · "+safe(t.date||"No due date")+" · "+safe(t.priority)+"</small></span><button type='button' class='btn btn-light remove-task' data-index='"+i+"'>Remove</button></div>").join(""):"<p>Your tasks will appear here.</p>";};
 const add=$("add-task");
 if(add)add.addEventListener("click",()=>{const name=$("task-name").value.trim();if(!name){$("task-name").focus();return;}tasks.push({name,owner:$("task-owner").value.trim(),date:$("task-date").value,priority:$("task-priority").value});$("task-name").value="";renderTasks();});
 if(planner)planner.addEventListener("click",e=>{const b=e.target.closest(".remove-task");if(b){tasks.splice(Number(b.dataset.index),1);renderTasks();}});
 const clear=$("clear-plan");if(clear)clear.addEventListener("click",()=>{tasks.length=0;renderTasks();});
 const download=$("download-plan");if(download)download.addEventListener("click",()=>{if(!tasks.length){planner.innerHTML="<p>Add at least one task before downloading.</p>";return;}const rows=[["Task","Owner","Due date","Priority"],...tasks.map(t=>[t.name,t.owner,t.date,t.priority])];const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");const a=document.createElement("a"),url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.href=url;a.download="careerpilot-weekly-plan.csv";a.click();URL.revokeObjectURL(url);});
 const draft=$("draft-email");
 if(draft)$("draft-email").addEventListener("click",()=>{
  const type=$("email-type").value,tone=$("email-tone").value,to=$("email-recipient").value.trim()||"there",from=$("email-sender").value.trim()||"[Your name]",details=$("email-details").value.trim()||"[Add the relevant details]";
  const subjects={followup:"Following up",meeting:"Request for a meeting",thankyou:"Thank you",client:"Project update",application:"Application for [Role title]"};
  const openings={followup:"I hope you are well. I wanted to follow up on our recent conversation and check whether there are any updates.",meeting:"I hope you are well. I would like to arrange a meeting to discuss the points below and agree on next steps.",thankyou:"Thank you for taking the time to speak with me. I appreciated the opportunity to connect.",client:"I am writing to share a brief update and outline the current position and next steps.",application:"I am writing to express my interest in the [Role title] opportunity. I have included my application materials for your consideration."};
  const close=tone==="formal"?"Please let me know if you require any further information. I look forward to your response.":tone==="concise"?"Please let me know the next step.":"Thanks again for your time. I look forward to hearing from you.";
  draft.value="Subject: "+subjects[type]+"\n\nDear "+to+",\n\n"+openings[type]+"\n\n"+details+"\n\n"+close+"\n\nKind regards,\n"+from;
 });
 const copy=$("copy-email");if(copy)copy.addEventListener("click",async()=>{if(!draft.value)return;try{await navigator.clipboard.writeText(draft.value);copy.textContent="Copied";}catch(_){draft.select();copy.textContent="Select and copy";}});
})();

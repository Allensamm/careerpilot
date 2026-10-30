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

/* CareerPilot free tools — local-first, validated and accessible */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const setMessage=(el,html)=>{if(el)el.innerHTML=html;};
 const words=value=>(String(value||"").toLowerCase().match(/[a-z][a-z'-]{2,}/g)||[]);
 const unique=items=>[...new Set(items.filter(Boolean))];
 const copyText=async(text,button)=>{
  try{
   if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(text);
   else {const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();if(!ok)throw new Error("Copy unavailable");}
   if(button){const old=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=old,1600);}
   return true;
  }catch(_){return false;}
 };
 const showCopyFallback=(text,container)=>{const area=document.createElement("textarea");area.value=text;area.rows=5;area.setAttribute("aria-label","Text to copy manually");container.appendChild(area);area.focus();area.select();};
 
 // 01 — CV review: browser-only PDF/DOCX extraction with useful failure states.
 const upload=$("cv-upload"),analyse=$("cv-analyse"),cvReport=$("cv-report");
 if(analyse&&upload&&cvReport)analyse.addEventListener("click",async()=>{
  const file=upload.files&&upload.files[0];
  if(!file){setMessage(cvReport,"<strong>Choose a CV to begin.</strong><p>Select a PDF or DOCX document first.</p>");upload.focus();return;}
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  if(!["pdf","docx"].includes(ext)){setMessage(cvReport,"<strong>Unsupported file type.</strong><p>Please choose a PDF or DOCX file.</p>");return;}
  if(file.size===0||file.size>10*1024*1024){setMessage(cvReport,"<strong>Check the file size.</strong><p>The document must be larger than 0 bytes and no more than 10 MB.</p>");return;}
  analyse.disabled=true;analyse.textContent="Reviewing…";
  setMessage(cvReport,"<strong>Reviewing your CV…</strong><p>Your document is being processed in this browser. It is not sent to CareerPilot.</p>");
  try{
   const buffer=await file.arrayBuffer();let extracted="";
   if(ext==="pdf"){
    if(!window.pdfjsLib)throw new Error("The PDF reader did not load. Check your connection, refresh the page and try again.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buffer)}).promise;
    if(pdf.numPages>40)throw new Error("This PDF has more than 40 pages. Please upload a shorter CV.");
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
     const page=await pdf.getPage(pageNo),content=await page.getTextContent();
     extracted+=content.items.map(item=>item.str||"").join(" ")+"\n";
    }
   }else{
    if(!window.mammoth)throw new Error("The DOCX reader did not load. Check your connection, refresh the page and try again.");
    const result=await window.mammoth.extractRawText({arrayBuffer:buffer});extracted=result.value||"";
   }
   const text=extracted.trim(),lower=text.toLowerCase(),count=words(text).length;
   if(count<35)throw new Error("Very little readable text was found. If this is a scanned PDF, run OCR first or upload a text-based PDF/DOCX.");
   const checks=[
    ["Contact details",/(email|@|phone|linkedin|www\.)/.test(lower),"Add a professional email address and a suitable contact method."],
    ["Professional summary",/(summary|profile|professional statement|career objective)/.test(lower),"Add a short, role-relevant professional summary."],
    ["Work experience",/(experience|employment|professional history|work history)/.test(lower),"Make your employment history easy to locate."],
    ["Education",/(education|academic|university|college|degree|diploma)/.test(lower),"Include relevant education or qualifications."],
    ["Skills",/(skills|competencies|technical|proficiencies)/.test(lower),"Include a clearly labelled skills section."],
    ["Achievements and evidence",/(achieved|improved|increased|reduced|delivered|managed|created|led|saved|%|\$|£|€)/.test(lower),"Use specific outcomes, scope or measurable achievements where accurate."],
    ["Dates and chronology",/(19[89]\d|20\d{2})/.test(text),"Check that role dates are clear and consistent."],
    ["Content length",count>=180&&count<=1400,count<180?"Your CV text is brief; check that the document is complete and includes relevant detail.":"Your CV is lengthy; prioritise the experience most relevant to your target role."]
   ];
   const passed=checks.filter(item=>item[1]).length,missing=checks.filter(item=>!item[1]);
   cvReport.innerHTML="<strong>"+passed+" of "+checks.length+" content checks passed</strong><p>"+count+" words extracted from <b>"+escapeHTML(file.name)+"</b>.</p><h3>Detected strengths</h3><ul>"+checks.filter(item=>item[1]).map(item=>"<li>"+escapeHTML(item[0])+"</li>").join("")+"</ul><h3>Recommended improvements</h3><ul>"+(missing.length?missing.map(item=>"<li><b>"+escapeHTML(item[0])+":</b> "+escapeHTML(item[2])+"</li>").join(""):"<li>Core content signals were detected. Check relevance and evidence against each vacancy.</li>")+"</ul><p class='tool-privacy'><b>Limitations:</b> This is a content checklist, not an ATS compatibility score or hiring prediction. It cannot reliably assess visual layout, tables, columns, reading order, spelling quality or how a specific employer's system parses the file. Review the original document before applying.</p>";
  }catch(error){setMessage(cvReport,"<strong>We couldn't complete the review.</strong><p>"+escapeHTML(error.message||"An unexpected error occurred.")+"</p><p>Try a standard text-based PDF or DOCX file.</p>");}
  finally{analyse.disabled=false;analyse.textContent="Review my CV";}
 });
 
 // 02 — LinkedIn content helper. This is a guided template generator, not an AI/live profile audit.
 const liButton=$("li-generate"),liOutput=$("li-output");
 if(liButton&&liOutput)liButton.addEventListener("click",()=>{
  const role=$("li-role").value.trim(),industry=$("li-industry").value.trim(),skills=$("li-skills").value.trim(),goal=$("li-goal").value.trim(),experience=$("li-experience").value.trim();
  if(!role||!skills){setMessage(liOutput,"<p><b>Please enter your target role and at least one key strength.</b></p>");(!role? $("li-role"):$("li-skills")).focus();return;}
  const list=skills.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  const headline=[role,list.slice(0,3).join(" · "),industry].filter(Boolean).join(" | ");
  const about="I am a "+role+(industry?" with experience in "+industry:"")+". My strengths include "+list.join(", ")+".\n\n"+(experience||"I bring a practical, thoughtful approach to solving problems, collaborating with teams and delivering quality work.")+"\n\n"+(goal?"I am currently focused on "+goal+".":"I am interested in connecting with professionals and organisations working on meaningful challenges in my field.")+"\n\nI value clear communication, continuous learning and work that makes a measurable difference.";
  const keywordIdeas=unique([role,industry,...list]);
  const themes=["A practical lesson from a recent project","How you approach a recurring challenge in your field","A useful tip for colleagues, clients or peers"];
  liOutput.innerHTML="<div class='generated-block'><h3>Headline suggestion</h3><textarea id='li-head-result' rows='2'>"+escapeHTML(headline)+"</textarea><button type='button' class='btn btn-light copy-generated' data-copy='li-head-result'>Copy headline</button></div><div class='generated-block'><h3>About section starting point</h3><textarea id='li-about-result' rows='8'>"+escapeHTML(about)+"</textarea><button type='button' class='btn btn-light copy-generated' data-copy='li-about-result'>Copy About section</button></div><div class='generated-block'><h3>Keyword ideas</h3><p>"+keywordIdeas.map(escapeHTML).join(" · ")+"</p></div><div class='generated-block'><h3>Content themes</h3><ul>"+themes.map(x=>"<li>"+escapeHTML(x)+"</li>").join("")+"</ul></div><p class='tool-privacy'>These are structured suggestions based on your inputs. This tool does not access LinkedIn, perform live keyword research or independently verify your experience. Edit every statement so it remains accurate and genuinely yours.</p>";
 });
 document.addEventListener("click",async event=>{
  const button=event.target.closest(".copy-generated");if(!button)return;
  const field=$(button.dataset.copy);if(!field)return;
  if(!await copyText(field.value,button)){field.focus();field.select();button.textContent="Select the text and copy";}
 });
 
 // 03 — time savings calculator.
 const calculate=$("calculate-time");
 if(calculate)calculate.addEventListener("click",()=>{
  const hours=Number($("admin-hours").value),share=Number($("delegate-share").value),weeks=Number($("work-weeks").value);
  if($("admin-hours").value.trim()===""||$("delegate-share").value.trim()===""||$("work-weeks").value.trim()===""||![hours,share,weeks].every(Number.isFinite)||hours<0||hours>168||share<0||share>100||weeks<1||weeks>52){
   $("time-results").innerHTML="<p role='alert'>Enter admin hours from 0–168, a delegation share from 0–100%, and 1–52 working weeks.</p>";return;
  }
  const weekly=hours*share/100,monthly=weekly*weeks/12,yearly=weekly*weeks;
  $("time-results").innerHTML="<div><strong>"+weekly.toFixed(1)+"</strong><span>Potential hours per week</span></div><div><strong>"+monthly.toFixed(1)+"</strong><span>Average hours per month</span></div><div><strong>"+yearly.toFixed(1)+"</strong><span>Potential hours per year</span></div>";
 });
 
 // 04 — six-dimension job application readiness self-assessment.
 const readiness=$("check-readiness");
 if(readiness)readiness.addEventListener("click",()=>{
  const ids=["jr-cv","jr-role","jr-tailor","jr-track","jr-linkedin","jr-interview"];
  const labels=["Update your CV and tailor it to a specific target role.","Choose a realistic target role and identify the evidence employers request.","Adapt relevant experience and achievements for each application.","Create a tracker for roles, deadlines, contacts and follow-ups.","Refresh your LinkedIn headline, About section and experience.","Prepare concise examples that demonstrate your skills and impact."];
  const values=ids.map(id=>Number($(id).value)),score=values.reduce((sum,value)=>sum+value,0),percent=Math.round(score/12*100),actions=ids.map((id,index)=>({value:values[index],label:labels[index]})).filter(item=>item.value<2);
  $("readiness-report").innerHTML="<strong>"+percent+"% checklist completion</strong><p>"+(score>=10?"You have a good foundation. Focus on relevance, tailoring and consistent follow-through.":score>=6?"You have some foundations in place. Strengthen the areas below before increasing application volume.":"Start with the fundamentals: define your target, prepare your materials and build a repeatable application process.")+"</p><h3>Your next steps</h3><ol>"+(actions.length?actions.map(item=>"<li>"+escapeHTML(item.label)+"</li>").join(""):"<li>Keep your materials current and review each application before submitting.</li>")+"</ol><p class='tool-privacy'>This is a self-assessment based on your answers, not a prediction of interviews, job offers or hiring outcomes.</p>";
 });
 
 // 05 — task planner with local persistence, safe CSV export and remove/clear controls.
 const planner=$("planner-list"),storageKey="careerpilot-free-tool-tasks-v1";
 let tasks=[];
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(saved))tasks=saved.filter(t=>t&&typeof t.name==="string").slice(0,300);}catch(_){tasks=[];}
 const saveTasks=()=>{try{localStorage.setItem(storageKey,JSON.stringify(tasks));}catch(_){if(planner)planner.insertAdjacentHTML("afterbegin","<p class='tool-privacy'>Your browser could not save this plan. You can still download it as a CSV.</p>");}};
 const renderTasks=()=>{
  if(!planner)return;
  if(!tasks.length){planner.innerHTML="<p>Your tasks will appear here. Add a task to start your plan.</p>";return;}
  const sorted=tasks.map((task,index)=>({...task,index})).sort((a,b)=>(a.date||"9999-12-31").localeCompare(b.date||"9999-12-31"));
  planner.innerHTML=sorted.map(task=>"<div class='planner-item'><span><b>"+escapeHTML(task.name)+"</b><small>"+escapeHTML(task.owner||"Unassigned")+" · "+escapeHTML(task.date||"No due date")+" · "+escapeHTML(task.priority)+" priority</small></span><button type='button' class='btn btn-light remove-task' data-index='"+task.index+"' aria-label='Remove "+escapeHTML(task.name)+"'>Remove</button></div>").join("");
 };
 renderTasks();
 const addTask=$("add-task");
 if(addTask)addTask.addEventListener("click",()=>{
  const name=$("task-name").value.trim(),date=$("task-date").value,owner=$("task-owner").value.trim(),priority=$("task-priority").value;
  if(!name){$("task-name").focus();planner.insertAdjacentHTML("afterbegin","<p role='alert'>Enter a task description before adding it.</p>");return;}
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){planner.insertAdjacentHTML("afterbegin","<p role='alert'>Choose a valid due date.</p>");return;}
  tasks.push({name,owner,date,priority});saveTasks();renderTasks();$("task-name").value="";$("task-name").focus();
 });
 if(planner)planner.addEventListener("click",event=>{const button=event.target.closest(".remove-task");if(!button)return;const index=Number(button.dataset.index);if(Number.isInteger(index)&&index>=0&&index<tasks.length){tasks.splice(index,1);saveTasks();renderTasks();}});
 const clear=$("clear-plan");if(clear)clear.addEventListener("click",()=>{if(!tasks.length)return;if(!window.confirm("Clear all tasks in this browser?"))return;tasks=[];saveTasks();renderTasks();});
 const download=$("download-plan");if(download)download.addEventListener("click",()=>{
  if(!tasks.length){planner.innerHTML="<p role='alert'>Add at least one task before downloading your plan.</p>";return;}
  const csvCell=value=>{let text=String(value??"");if(/^[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const rows=[["Task","Owner","Due date","Priority"],...tasks.map(task=>[task.name,task.owner,task.date,task.priority])];
  const csv="\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),anchor=document.createElement("a");
  anchor.href=url;anchor.download="careerpilot-task-plan.csv";document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 
 // 06 — editable, template-based email writer (not an AI service and never sends).
 const draftButton=$("draft-email"),draft=$("email-draft"),copyButton=$("copy-email");
 if(draftButton&&draft)draftButton.addEventListener("click",()=>{
  const type=$("email-type").value,tone=$("email-tone").value,recipient=$("email-recipient").value.trim()||"there",sender=$("email-sender").value.trim()||"[Your name]",details=$("email-details").value.trim();
  if(!details){$("email-details").focus();draft.value="Please add the key details you want the message to communicate, then generate your draft.";return;}
  const subjects={followup:"Following up",meeting:"Meeting request",thankyou:"Thank you",client:"Project update",application:"Application for [Role title]"};
  const openings={
   followup:"I hope you are well. I am following up on our recent conversation and would appreciate an update when convenient.",
   meeting:"I hope you are well. I would like to arrange a meeting to discuss the points below and agree on practical next steps.",
   thankyou:"Thank you for taking the time to speak with me. I appreciated the opportunity to connect and learn more.",
   client:"I am writing to share an update on the work and outline the current position and next steps.",
   application:"I am writing to express my interest in the [Role title] opportunity. I would welcome the opportunity to be considered."
  };
  const closing=tone==="formal"?"Please let me know if you require any further information. I look forward to your response.":tone==="concise"?"Please let me know if you need anything further.": "Thank you for your time. I look forward to hearing from you.";
  const greeting=tone==="formal"?"Dear "+recipient+",":"Hello "+recipient+",";
  draft.value="Subject: "+subjects[type]+"\n\n"+greeting+"\n\n"+openings[type]+"\n\n"+details+"\n\n"+closing+"\n\nKind regards,\n"+sender;
  draft.focus();
 });
 if(copyButton&&draft)copyButton.addEventListener("click",async()=>{
  if(!draft.value.trim()){draft.focus();return;}
  if(!await copyText(draft.value,copyButton)){draft.focus();draft.select();copyButton.textContent="Select the draft and copy";}
 });
})();
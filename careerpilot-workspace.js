import {analyzeCV,buildLinkedInPack,calculateTimeSavings,assessJobReadiness,buildWeeklyPlan,buildEmailDraft} from "./src/free-tools.mjs";
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const STORAGE_KEY="careerpilot-free-tool-tasks-v1";
 let busy=false;

 const showMessage=(container,title,message)=>{
  if(!container)return;
  container.innerHTML="<section class='work-result-card'><h3>"+escapeHTML(title)+"</h3><p role='status'>"+escapeHTML(message)+"</p></section>";
 };
 const outputCard=(container,title)=>{
  if(!container)throw new Error("The result area could not be found. Refresh the page and try again.");
  const card=document.createElement("section");card.className="work-result-card";
  const heading=document.createElement("h3");heading.textContent=title;
  const status=document.createElement("p");status.className="work-status";status.setAttribute("role","status");status.textContent="Preparing your result…";
  const progress=document.createElement("progress");progress.className="work-progress";progress.removeAttribute("value");progress.setAttribute("aria-label","Work in progress");
  const content=document.createElement("div");content.className="work-result-content";
  card.append(heading,status,progress,content);container.replaceChildren(card);
  return {card,status,progress,content};
 };
 const downloadText=(text,fileName,mime="text/plain;charset=utf-8")=>{
  const url=URL.createObjectURL(new Blob([text],{type:mime}));
  const link=document.createElement("a");link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1200);
 };
 const addReportActions=(container,text,fileName)=>{
  const actions=document.createElement("div");actions.className="work-result-actions";
  const copy=document.createElement("button");copy.type="button";copy.className="btn btn-light";copy.textContent="Copy report";
  copy.addEventListener("click",async()=>{
   try{await navigator.clipboard.writeText(text);copy.textContent="Copied";}
   catch(_){const area=document.createElement("textarea");area.value=text;area.rows=5;container.appendChild(area);area.focus();area.select();copy.textContent="Select and copy";}
  });
  const download=document.createElement("button");download.type="button";download.className="btn btn-light";download.textContent="Download report";
  download.addEventListener("click",()=>downloadText(text,fileName));
  actions.append(copy,download);container.appendChild(actions);
 };
 const localISODate=()=>{
  const now=new Date(),offset=now.getTimezoneOffset()*60000;
  return new Date(now.getTime()-offset).toISOString().slice(0,10);
 };
 const readTasks=()=>{
  try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(parsed)?parsed:[];}
  catch(_){return [];}
 };
 const runWithFeedback=async(button,handler)=>{
  if(busy)return;
  busy=true;
  const buttons=[...document.querySelectorAll("[data-work-action]")];
  const states=buttons.map(item=>({item,disabled:item.disabled,html:item.innerHTML}));
  buttons.forEach(item=>{item.disabled=true;});
  button.setAttribute("aria-busy","true");
  button.innerHTML='<span class="tool-spinner" aria-hidden="true"></span> Working…';
  try{
   await new Promise(resolve=>window.setTimeout(resolve,35));
   await handler();
  }catch(error){
   console.error("CareerPilot resource error",error);
   const message=error&&error.message?error.message:"Something went wrong. Please check your information and try again.";
   const destinations={cv:"cv-report",linkedin:"li-output",time:"time-insight",readiness:"readiness-report",tasks:"planner-insight"};
   if(button.dataset.workAction==="email"){
    const note=$("email-work-status");if(note)note.textContent=message;
   }else showMessage($(destinations[button.dataset.workAction]),"We couldn't complete this step",message);
  }finally{
   states.forEach(state=>{state.item.disabled=state.disabled;state.item.innerHTML=state.html;state.item.removeAttribute("aria-busy");});
   button.removeAttribute("aria-busy");busy=false;
  }
 };

 async function extractCV(file){
  if(!file)throw new Error("Choose a CV in PDF or DOCX format before starting the review.");
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  if(!["pdf","docx"].includes(ext))throw new Error("Please upload a PDF or DOCX file.");
  if(!file.size||file.size>10*1024*1024)throw new Error("The document must be larger than zero bytes and no more than 10 MB.");
  const buffer=await file.arrayBuffer();let text="";
  if(ext==="pdf"){
   if(!window.pdfjsLib)throw new Error("The PDF reader did not load. Check your connection, refresh the page and try again.");
   window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
   const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buffer)}).promise;
   if(pdf.numPages>40)throw new Error("This PDF has more than 40 pages. Please upload a shorter CV.");
   for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo),data=await page.getTextContent();
    text+=data.items.map(item=>(item.str||"")+(item.hasEOL?"\n":" ")).join("");
   }
  }else{
   if(!window.mammoth)throw new Error("The DOCX reader did not load. Check your connection, refresh the page and try again.");
   const result=await window.mammoth.extractRawText({arrayBuffer:buffer});text=result.value||"";
  }
  text=text.trim();
  if(text.split(/\s+/).filter(Boolean).length<35)throw new Error("Very little readable text was found. If this is a scanned PDF, run OCR first or upload a text-based PDF/DOCX.");
  return {text:text.slice(0,30000),truncated:text.length>30000,name:file.name};
 }

 function renderCV(analysis,truncated){
  const target=analysis.role?"<p><b>Target role:</b> "+escapeHTML(analysis.role)+"</p>":"<p>Add a target role to make the next review more specific.</p>";
  const checks=analysis.checks.map(item=>"<li class='review-check "+(item.passed===true?"is-pass":item.passed===false?"is-gap":"is-neutral")+"'><span><b>"+escapeHTML(item.label)+"</b><small>"+escapeHTML(item.detail)+"</small></span><strong>"+(item.passed===true?"Present":item.passed===false?"Review":"Not assessed")+"</strong></li>").join("");
  const strengths=analysis.strengths.length?analysis.strengths.map(x=>"<li>"+escapeHTML(x)+"</li>").join(""):"<li>The document was readable. Focus first on adding clear sections and evidence.</li>";
  const fixes=analysis.improvements.length?analysis.improvements.map(x=>"<li><b>"+escapeHTML(x.label)+":</b> "+escapeHTML(x.fix)+"</li>").join(""):"<li>Core content signals are present. Improve role relevance and ensure every claim is supported by evidence.</li>";
  const weak=analysis.weakBullets.length?analysis.weakBullets.map(line=>"<li><p><b>Current wording:</b> "+escapeHTML(line)+"</p><p><b>Stronger structure:</b> [Action verb] + [what you delivered] + [scope, team or tool] + [verified outcome].</p></li>").join(""):"<li>No obvious duty-only phrases were detected by the phrase check. Manually review each bullet for a clear action, scope and result.</li>";
  const keywords=analysis.role?("<p><b>Detected:</b> "+(analysis.matchedKeywords.map(escapeHTML).join(", ")||"No target terms detected")+"</p><p><b>Not detected:</b> "+(analysis.missingKeywords.map(escapeHTML).join(", ")||"All supplied role terms were found")+"</p>"):"<p>Enter a target role to compare role terms with the CV. Only add missing terms when they accurately describe your experience.</p>";
  const template="<pre class='work-template'>"+escapeHTML(analysis.summaryTemplate)+"</pre>";
  const limitation="<p class='tool-privacy'>"+escapeHTML(analysis.limitations)+(truncated?" The extracted text was shortened to the first 30,000 characters.":"")+"</p>";
  return "<div class='cv-pro-score'><strong>"+analysis.score+"<small>/100</small></strong><span><b>"+escapeHTML(analysis.grade)+"</b><br><small>CareerPilot content review · not an ATS score</small></span></div>"+target+"<div class='tool-metrics'><div><strong>"+analysis.wordCount.toLocaleString()+"</strong><span>Words reviewed</span></div><div><strong>"+analysis.metricCount+"</strong><span>Evidence signals</span></div><div><strong>"+analysis.bulletCount+"</strong><span>Bullet-style lines</span></div><div><strong>"+analysis.actionVerbCount+"</strong><span>Action-verb types</span></div></div><h3>Section-by-section assessment</h3><ul class='review-check-list'>"+checks+"</ul><h3>What is already working</h3><ul>"+strengths+"</ul><h3>Priority improvements</h3><ol>"+fixes+"</ol><h3>Examples to strengthen</h3><ul>"+weak+"</ul><h3>Target-role keyword comparison</h3>"+keywords+"<h3>Professional summary framework</h3>"+template+"<p>Use this as a structure, not as a statement of facts. Replace every bracketed item with accurate information.</p>"+limitation;
 }
 async function doCV(){
  const file=$("cv-upload")&&$("cv-upload").files[0],target=($("cv-target-role")&&$("cv-target-role").value.trim())||"";
  const result=outputCard($("cv-report"),"CareerPilot · CV health check");
  result.status.textContent="Reading your document in this browser…";
  const cv=await extractCV(file);
  result.status.textContent="Assessing sections, evidence and role relevance…";
  const analysis=analyzeCV(cv.text,target);
  result.content.innerHTML=renderCV(analysis,cv.truncated);
  result.status.textContent="Review complete · "+cv.name;
  const reportText=["CAREERPILOT CV HEALTH CHECK","File: "+cv.name,"Content review: "+analysis.score+"/100 — "+analysis.grade,"Words reviewed: "+analysis.wordCount,"Target role: "+(target||"Not supplied"),"","SECTION ASSESSMENT",...analysis.checks.map(x=>(x.passed===true?"PRESENT: ":x.passed===false?"REVIEW: ":"NOT ASSESSED: ")+x.label+" — "+x.detail),"","PRIORITY IMPROVEMENTS",...analysis.improvements.map((x,i)=>(i+1)+". "+x.label+" — "+x.fix),"","ROLE TERMS FOUND: "+analysis.matchedKeywords.join(", "),"ROLE TERMS NOT FOUND: "+analysis.missingKeywords.join(", "),"","SUMMARY FRAMEWORK",analysis.summaryTemplate,"",analysis.limitations].join("\n");
  addReportActions(result.card,reportText,"CareerPilot-CV-Health-Check.txt");
 }
 function renderLinkedIn(pack){
  const headlines=pack.headlineOptions.map((text,i)=>"<div class='generated-block'><h4>Headline option "+(i+1)+"</h4><textarea rows='2' readonly>"+escapeHTML(text)+"</textarea></div>").join("");
  const keywords=pack.keywords.map(x=>"<span class='keyword-chip'>"+escapeHTML(x)+"</span>").join("");
  const bullets=pack.experienceTemplates.map(x=>"<li>"+escapeHTML(x)+"</li>").join("");
  const featured=pack.featured.map(x=>"<li>"+escapeHTML(x)+"</li>").join("");
  const posts=pack.postIdeas.map(x=>"<li>"+escapeHTML(x)+"</li>").join("");
  return headlines+"<div class='generated-block'><h4>About section draft</h4><textarea id='li-about-result' rows='12'>"+escapeHTML(pack.about)+"</textarea><button type='button' class='btn btn-light copy-profile-field' data-copy-id='li-about-result'>Copy About section</button></div><div class='generated-block'><h4>Relevant keyword ideas</h4><div class='keyword-list'>"+keywords+"</div></div><div class='generated-block'><h4>Experience bullet frameworks</h4><ol>"+bullets+"</ol></div><div class='generated-block'><h4>Featured section ideas</h4><ul>"+featured+"</ul></div><div class='generated-block'><h4>Content prompts</h4><ul>"+posts+"</ul></div><p class='tool-privacy'>"+escapeHTML(pack.disclaimer)+"</p>";
 }
 async function doLinkedIn(){
  const pack=buildLinkedInPack({role:$("li-role").value,industry:$("li-industry").value,skills:$("li-skills").value,goal:$("li-goal").value,experience:$("li-experience").value});
  const container=$("li-output");container.innerHTML=renderLinkedIn(pack);
  container.querySelectorAll(".copy-profile-field").forEach(button=>button.addEventListener("click",async()=>{
   const field=$(button.dataset.copyId);if(!field)return;
   try{await navigator.clipboard.writeText(field.value);button.textContent="Copied";}
   catch(_){field.focus();field.select();button.textContent="Select and copy";}
  }));
  const text=["LINKEDIN PROFILE IMPROVEMENT",...pack.headlineOptions.map((x,i)=>"Headline "+(i+1)+": "+x),"","ABOUT SECTION",pack.about,"","KEYWORDS",pack.keywords.join(", "),"","EXPERIENCE FRAMEWORKS",...pack.experienceTemplates,"","FEATURED SECTION",...pack.featured,"","CONTENT PROMPTS",...pack.postIdeas,"",pack.disclaimer].join("\n");
  addReportActions(container,text,"CareerPilot-LinkedIn-Profile-Improvement.txt");
 }
 async function doTime(){
  const result=calculateTimeSavings({adminHours:$("admin-hours").value,delegatePercent:$("delegate-share").value,workingWeeks:$("work-weeks").value,hourValue:$("hour-value")?$("hour-value").value:""});
  const metrics=$("time-results");
  const entries=[[result.weekly.toFixed(1),"Potential hours per week"],[result.monthly.toFixed(1),"Average hours per month"],[result.annual.toFixed(1),"Potential hours per year"]];
  if(result.annualValue!==null)entries.push([result.annualValue.toLocaleString(undefined,{maximumFractionDigits:2}),"Illustrative annual time value"]);
  metrics.innerHTML=entries.map(item=>"<div><strong>"+escapeHTML(item[0])+"</strong><span>"+escapeHTML(item[1])+"</span></div>").join("");
  const suggestions=[];
  if(result.weekly>=8)suggestions.push("Your estimate suggests a meaningful block of time could be reassigned. Start by documenting recurring tasks and the decisions they require.");
  else if(result.weekly>=2)suggestions.push("Start with one or two repeatable tasks that have clear instructions and low approval risk.");
  else suggestions.push("Begin with a small, low-risk task. A short handover can reveal whether delegation is worthwhile.");
  if(result.weekly===0)suggestions.push("At the current settings, no hours are estimated to be released. Adjust the delegation percentage only if it reflects a realistic opportunity.");
  suggestions.push("Examples to review—not assumptions about your business—include inbox triage, calendar coordination, meeting notes, document formatting, research and follow-up tracking.");
  const report="<h3>Your estimate</h3><p>"+result.weekly.toFixed(1)+" hours per week could be released if the selected tasks can genuinely be delegated.</p><h3>Where to start</h3><ol>"+suggestions.map(x=>"<li>"+escapeHTML(x)+"</li>").join("")+"</ol><h3>A practical two-week pilot</h3><ol><li><b>Days 1–2:</b> List recurring tasks, frequency, inputs, deadlines and decisions that must stay with you.</li><li><b>Days 3–5:</b> Choose one low-risk task, write a checklist and agree what a completed task looks like.</li><li><b>Week 2:</b> Delegate the task, review a sample of completed work and record time spent on handover and corrections.</li><li><b>End of week 2:</b> Compare time released with onboarding and oversight time. Keep, adjust or stop the task based on evidence.</li></ol><p class='tool-privacy'>This is an estimate, not guaranteed cash savings. It excludes delegation fees, onboarding, supervision and any work that cannot be transferred.</p>";
  const container=$("time-insight");container.innerHTML="<section class='work-result-card'>"+report+"</section>";
  const reportText="CAREERPILOT PRODUCTIVITY ESTIMATE\nPotential hours per week: "+result.weekly.toFixed(1)+"\nAverage hours per month: "+result.monthly.toFixed(1)+"\nPotential hours per year: "+result.annual.toFixed(1)+(result.annualValue===null?"":"\nIllustrative annual time value: "+result.annualValue.toFixed(2))+"\n\n"+suggestions.join("\n")+"\n\nTwo-week pilot: document, trial, review and measure. This is not guaranteed cash savings and excludes fees, onboarding and oversight.";
  addReportActions(container.querySelector(".work-result-card"),reportText,"CareerPilot-Productivity-Plan.txt");
 }
 async function doReadiness(){
  const values={cv:$("jr-cv").value,role:$("jr-role").value,tailor:$("jr-tailor").value,track:$("jr-track").value,linkedin:$("jr-linkedin").value,interview:$("jr-interview").value};
  const report=assessJobReadiness(values);
  const strengths=report.strengths.length?report.strengths.map(x=>"<li>"+escapeHTML(x.label)+"</li>").join(""):"<li>No area was marked fully in place yet. Start with the first week of the plan.</li>";
  const gaps=report.gaps.map(x=>"<li><b>"+escapeHTML(x.label)+" — "+escapeHTML(x.status)+":</b> "+escapeHTML(x.recommendation)+"</li>").join("");
  const weeks=report.plan.map(week=>"<div class='generated-block'><h4>"+escapeHTML(week.week)+"</h4><ul>"+week.tasks.map(task=>"<li>"+escapeHTML(task)+"</li>").join("")+"</ul></div>").join("");
  const html="<div class='cv-pro-score'><strong>"+report.percent+"<small>%</small></strong><span><b>"+escapeHTML(report.grade)+"</b><br><small>"+report.total+" of 12 checklist points</small></span></div><h3>What is already in place</h3><ul>"+strengths+"</ul><h3>Priority gaps</h3><ol>"+gaps+"</ol><h3>Your 30-day action plan</h3>"+weeks+"<h3>Weekly application routine</h3><ul><li>Choose suitable roles before preparing applications.</li><li>Tailor evidence to each role's essential requirements.</li><li>Track deadlines, submissions and follow-up dates.</li><li>Reserve time for interview practice and professional networking.</li></ul><p class='tool-privacy'>"+escapeHTML(report.disclaimer)+"</p>";
  const container=$("readiness-report");container.innerHTML=html;
  const text=["CAREERPILOT JOB SEARCH READINESS",report.percent+"% checklist completion — "+report.grade,"","STRENGTHS",...report.strengths.map(x=>x.label),"","PRIORITY GAPS",...report.gaps.map(x=>x.label+": "+x.recommendation),"","30-DAY PLAN",...report.plan.flatMap(w=>[w.week,...w.tasks]),"",report.disclaimer].join("\n");
  addReportActions(container,text,"CareerPilot-Job-Search-Readiness-Plan.txt");
 }
 async function doTasks(){
  const tasks=readTasks();if(!tasks.length)throw new Error("Add at least one task to your weekly planner before building a plan.");
  const plan=buildWeeklyPlan(tasks,localISODate());
  const groupInfo=[["overdue","Overdue","Review these first and renegotiate dates where necessary."],["dueSoon","Due within the next 7 days","Order by priority and confirm the next action."],["later","Later","Keep these visible without letting them crowd out this week's commitments."],["undated","No due date","Set a realistic deadline if the task is time-sensitive."]];
  const groups=groupInfo.map(([key,title,description])=>{
   const items=plan.groups[key];
   return "<div class='generated-block'><h4>"+escapeHTML(title)+" ("+items.length+")</h4><p>"+escapeHTML(description)+"</p>"+(items.length?"<ol>"+items.map(task=>"<li><b>"+escapeHTML(task.name)+"</b><small>"+escapeHTML(task.owner||"Owner not assigned")+" · "+escapeHTML(task.date||"No date")+" · "+escapeHTML(task.priority||"Medium")+" priority</small></li>").join("")+"</ol>":"<p>No tasks in this group.</p>")+"</div>";
  }).join("");
  const flags=plan.dependencyFlags.length?"<p><b>Possible dependencies to confirm:</b> "+plan.dependencyFlags.map(escapeHTML).join("; ")+"</p>":"";
  const html="<div class='tool-metrics'><div><strong>"+plan.total+"</strong><span>Tasks reviewed</span></div><div><strong>"+plan.groups.overdue.length+"</strong><span>Overdue</span></div><div><strong>"+plan.groups.dueSoon.length+"</strong><span>Due this week</span></div><div><strong>"+plan.missingOwners+"</strong><span>Without an owner</span></div></div>"+groups+flags+"<div class='generated-block'><h4>Weekly review checklist</h4><ol>"+plan.reviewChecklist.map(x=>"<li>"+escapeHTML(x)+"</li>").join("")+"</ol></div><p class='tool-privacy'>This plan organises the tasks you entered. Suggested order does not replace your judgement about business-critical dependencies.</p>";
  const container=$("planner-insight");container.innerHTML="<section class='work-result-card'><h3>CareerPilot · Weekly operations plan</h3><p class='work-status'>Organised for "+escapeHTML(plan.today)+" to "+escapeHTML(plan.weekEnd)+".</p>"+html+"</section>";
  const text=["CAREERPILOT WEEKLY OPERATIONS PLAN","Planning window: "+plan.today+" to "+plan.weekEnd,"Total tasks: "+plan.total,"Overdue: "+plan.groups.overdue.length,"Due within seven days: "+plan.groups.dueSoon.length,"Tasks without an owner: "+plan.missingOwners,"",...groupInfo.flatMap(([key,title])=>[title,...plan.groups[key].map(t=>"- "+t.name+" | "+(t.owner||"Unassigned")+" | "+(t.date||"No due date")+" | "+(t.priority||"Medium")),""]),"WEEKLY REVIEW",...plan.reviewChecklist].join("\n");
  addReportActions(container.querySelector(".work-result-card"),text,"CareerPilot-Weekly-Operations-Plan.txt");
 }
 async function doEmail(){
  const result=buildEmailDraft({type:$("email-type").value,tone:$("email-tone").value,recipient:$("email-recipient").value,sender:$("email-sender").value,details:$("email-details").value});
  $("email-draft").value=result.body;
  const note=$("email-work-status");if(note)note.textContent="Your editable draft is ready. Review the names, facts and placeholders before sending.";
 }
 const handlers={cv:doCV,linkedin:doLinkedIn,time:doTime,readiness:doReadiness,tasks:doTasks,email:doEmail};
 document.addEventListener("click",event=>{
  const button=event.target.closest("[data-work-action]");if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.disabled)return;
  const handler=handlers[button.dataset.workAction];if(!handler)return;
  runWithFeedback(button,handler);
 },true);
})();
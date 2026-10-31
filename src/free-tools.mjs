const STOPWORDS=new Set(("a an and are as at be by for from has have in into is it its of on or our the their this to was were with your you we will can should must may about across after also any based before between both but each every experience experienced professional role career job work working seeking looking open currently including using strong good great excellent senior junior lead manager").split(" "));
const SKILL_TERMS=["account management","administration","administrative support","agile","analytics","autocad","bookkeeping","budgeting","business analysis","business development","calendar management","campaign management","client service","communication","content creation","content writing","copywriting","customer care","customer service","customer support","data analysis","data entry","data visualisation","digital marketing","documentation","excel","financial analysis","financial reporting","figma","google analytics","graphic design","human resources","inventory management","javascript","leadership","logistics","microsoft excel","microsoft office","negotiation","office management","operations","payroll","people management","performance reporting","power bi","procurement","project coordination","project management","python","quality assurance","recruitment","research","risk management","sales","seo","social media","stakeholder management","strategic planning","supply chain","team leadership","technical support","training","typescript","user research","ux design","vendor management","wordpress","writing"];
const ACTION_VERBS=["achieved","analysed","analyzed","automated","built","coached","collaborated","created","delivered","designed","developed","directed","established","evaluated","executed","improved","implemented","increased","introduced","launched","led","managed","mentored","negotiated","optimised","optimized","organised","organized","reduced","resolved","restructured","saved","secured","simplified","streamlined","supervised","trained"];
const escapeRegExp=value=>String(value).replace(/[.*+?^$()|[\]\\]/g,"\\$&");
const contains=(text,phrase)=>new RegExp("(^|[^a-z0-9+#])"+escapeRegExp(phrase)+"(?=$|[^a-z0-9+#])","i").test(text);
const unique=items=>Array.from(new Set(items.filter(Boolean)));
const words=text=>(String(text||"").toLowerCase().match(/[a-z][a-z0-9+#'-]*/g)||[]);
const splitList=value=>unique(String(value||"").split(/[,;\n|]+/).map(x=>x.trim()).filter(Boolean));
const skillMatches=text=>SKILL_TERMS.filter(skill=>contains(String(text||"").toLowerCase(),skill));
const priorityOrder={High:0,Medium:1,Low:2};
const labelPriority=value=>priorityOrder[String(value||"Medium")]??1;

export function analyzeCV(text,targetRole=""){
 const source=String(text||"").replace(/\r/g,"").trim();
 const lower=source.toLowerCase();
 const tokens=words(source);
 const wordCount=tokens.length;
 const lines=source.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const bulletLines=lines.filter(x=>/^(?:[•●▪*-]|\d+[.)])\s+/.test(x));
 const metricMatches=source.match(/(?:[$£€]\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:[.,]\d+)?\s?(?:%|percent|years?|months?|weeks?|days?|hours?|clients?|customers?|projects?|people|staff|users?|k|m|million|billion)\b)/gi)||[];
 const verbMatches=ACTION_VERBS.filter(v=>new RegExp("\\b"+v+"\\b","i").test(source));
 const dates=source.match(/\b(?:19|20)\d{2}\b/g)||[];
 const contactEmail=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(source);
 const contactPhone=/(?:\+?\d[\d\s().-]{7,}\d)/.test(source);
 const contactLinkedIn=/linkedin\.com\/in\//i.test(source);
 const contact=contactEmail||contactPhone||contactLinkedIn;
 const summary=/(professional summary|career summary|profile summary|summary|profile|career objective|personal statement)/i.test(source);
 const experience=/(professional experience|work experience|employment history|career history|work history|experience)/i.test(source);
 const education=/(education|academic background|qualifications|university|college|degree|diploma)/i.test(source);
 const skills=/(core skills|key skills|technical skills|skills|competencies|areas of expertise)/i.test(source);
 const achievement=metricMatches.length>0||verbMatches.length>=3;
 const chronology=dates.length>=2;
 const length=wordCount>=120&&wordCount<=1500;
 const bullets=bulletLines.length>=3||verbMatches.length>=4;
 const role=String(targetRole||"").trim();
 const roleTerms=unique(words(role).filter(w=>w.length>2&&!STOPWORDS.has(w)));
 const roleSkills=skillMatches(role);
 const targetTerms=unique(roleSkills.concat(roleTerms));
 const matchedKeywords=targetTerms.filter(term=>contains(lower,term));
 const missingKeywords=targetTerms.filter(term=>!contains(lower,term));
 const roleScore=role?Math.round((matchedKeywords.length/Math.max(1,targetTerms.length))*10):5;
 const checks=[
  {key:"contact",label:"Contact information",weight:10,passed:contact,detail:contact?"At least one contact method was detected.":"No clear email, phone number or LinkedIn profile link was detected.",fix:"Add a professional email address and one reliable contact method. Include a LinkedIn URL if you use LinkedIn."},
  {key:"summary",label:"Professional summary",weight:10,passed:summary,detail:summary?"A summary or profile heading was detected.":"A clearly labelled summary or profile section was not detected.",fix:"Add a short, specific summary that connects your experience and strongest evidence to the role you want."},
  {key:"experience",label:"Work experience",weight:15,passed:experience,detail:experience?"An experience or employment section was detected.":"A work-history heading was not detected.",fix:"Use a clearly labelled experience section with role, organisation, dates and outcome-led bullet points."},
  {key:"education",label:"Education and qualifications",weight:5,passed:education,detail:education?"Education or qualification information was detected.":"An education or qualification section was not detected.",fix:"Include relevant qualifications, institutions and completion dates. If not applicable, use relevant training or certifications."},
  {key:"skills",label:"Skills presentation",weight:10,passed:skills,detail:skills?"A skills or competencies section was detected.":"A clearly labelled skills section was not detected.",fix:"Add a focused skills section. Prioritise capabilities that are supported by your work examples."},
  {key:"achievements",label:"Achievements and evidence",weight:15,passed:achievement,detail:metricMatches.length+" measurable evidence signal(s) and "+verbMatches.length+" action-verb types were detected.",fix:"Show what changed because of your work. Add truthful figures, scope, frequency, quality improvements or delivery outcomes where available."},
  {key:"chronology",label:"Employment dates",weight:5,passed:chronology,detail:dates.length+" year reference(s) were detected.",fix:"Make dates clear and consistent for each role, qualification and relevant career period."},
  {key:"length",label:"Content coverage",weight:10,passed:length,detail:wordCount+" words were extracted.",fix:wordCount<120?"Add enough relevant detail to demonstrate your experience and capabilities.":"Remove repetition and less relevant detail. Keep the strongest evidence for your target role."},
  {key:"bullets",label:"Scannable achievement statements",weight:10,passed:bullets,detail:bulletLines.length+" bullet-style lines and "+verbMatches.length+" recognised action-verb types were detected.",fix:"Use concise bullets that begin with an action and explain the task, scope and result. Avoid long blocks of duties."},
  {key:"role",label:"Target-role relevance",weight:10,passed:role?roleScore>=6:null,detail:role?(matchedKeywords.length+" of "+targetTerms.length+" target-role terms were found."): "No target role was supplied, so role relevance could not be assessed.",fix:role?"Compare the vacancy requirements with your evidence. Add missing terms only where they accurately describe your skills or experience.":"Enter a target role to receive a more useful relevance and keyword comparison."}
 ];
 const score=Math.round(checks.reduce((sum,item)=>sum+(item.passed===null?item.weight*.5:item.passed?item.weight:0),0));
 const weakBullets=lines.filter(line=>line.length>=25&&line.length<=220&&/(responsible for|duties included|worked on|helped with|assisted with|involved in|tasked with|handled)/i.test(line)).slice(0,4);
 const strengths=[];
 if(contact)strengths.push("At least one contact method is present.");
 if(experience)strengths.push("Work experience is identifiable.");
 if(skills)strengths.push("Skills are grouped in a dedicated section.");
 if(metricMatches.length)strengths.push("The CV includes measurable evidence signals.");
 if(bulletLines.length>=3)strengths.push("The document uses bullet-style content.");
 const improvements=checks.filter(item=>item.passed===false).sort((a,b)=>b.weight-a.weight);
 return {score,grade:score>=85?"Strong foundation":score>=70?"Good foundation with improvements needed":score>=50?"Needs focused improvement":"Needs substantial improvement",wordCount,bulletCount:bulletLines.length,metricCount:metricMatches.length,actionVerbCount:verbMatches.length,checks,strengths,improvements,weakBullets,role,matchedKeywords,missingKeywords,targetTerms,datesFound:dates.length,summaryTemplate:"[Target role] professional with experience in [relevant function or industry] and strengths in [two or three verified skills]. Evidence includes [specific project, responsibility or achievement]. Seeking to contribute these capabilities to [type of team, organisation or business need].",limitations:"This is a structured text-based content review. It does not inspect visual layout, reading order, spelling quality, document metadata or a particular employer's applicant-tracking system. It is not a hiring prediction. Keyword matches are based only on the target role you supplied."};
}

export function buildLinkedInPack({role,industry,skills,goal,experience}={}){
 const target=String(role||"").trim(),field=String(industry||"").trim(),strengths=splitList(skills),objective=String(goal||"").trim(),background=String(experience||"").trim();
 if(!target)throw new Error("Enter a target role to shape your LinkedIn positioning.");
 if(!strengths.length)throw new Error("Enter at least one key strength or professional skill.");
 const top=strengths.slice(0,3);
 const headlineOptions=[
  [target,top.join(" · "),field].filter(Boolean).join(" | "),
  [target,"Specialising in "+top.slice(0,2).join(" and "),objective?"Focused on "+objective:field].filter(Boolean).join(" | "),
  [target,top.join(" · "),objective?"Interested in "+objective:"Professional growth and collaboration"].filter(Boolean).join(" | ")
 ];
 const about=["I work as a "+target+(field?" in the "+field+" space":"")+", with strengths in "+strengths.join(", ")+".",background||"[Add two or three sentences about the teams, clients, projects, processes or responsibilities you have genuinely worked with.]","[Add one or two specific achievements. Explain the challenge, what you contributed and the verified outcome. Include figures only when you can substantiate them.]",objective?"I am currently focused on "+objective+".":"I am interested in connecting with professionals and organisations working on relevant challenges in my field.","I value thoughtful collaboration, clear communication and continuous professional development."].join("\n\n");
 const keywords=unique([target,field].concat(strengths).concat(words(target+" "+field).filter(w=>w.length>3&&!STOPWORDS.has(w))));
 const experienceTemplates=[
  "Delivered [specific project, service or process] using "+top[0]+", supporting [team, client group or business need] and achieving [verified outcome].",
  "Improved [process or result] through "+(top[1]||top[0])+", with impact measured by [accurate metric or evidence].",
  "Collaborated with [stakeholders or teams] to [deliver a specific output] within [scope or timeframe]."
 ];
 const featured=["A concise portfolio or case study showing work you are authorised to share","A presentation, project summary, article or professional resource relevant to your target role","A certificate or qualification that supports your positioning"];
 const postIdeas=["Share a practical lesson from a project or responsibility you can discuss publicly.","Explain how you approach a recurring challenge in "+(field||"your field")+".","Offer a useful checklist or short tip connected to "+top[0]+".","Reflect on a professional lesson and how you apply it in your work."];
 return {headlineOptions,about,keywords,experienceTemplates,featured,postIdeas,background,disclaimer:"These suggestions use only the information entered here. They do not access your LinkedIn account, inspect your live profile, verify your experience or perform live keyword research. Replace every placeholder with accurate evidence before publishing."};
}

export function calculateTimeSavings({adminHours,delegatePercent,workingWeeks,hourValue}={}){
 const hours=Number(adminHours),share=Number(delegatePercent),weeks=Number(workingWeeks);
 const value=hourValue===""||hourValue===null||hourValue===undefined?null:Number(hourValue);
 if(!Number.isFinite(hours)||hours<0||hours>168)throw new RangeError("Weekly admin hours must be between 0 and 168.");
 if(!Number.isFinite(share)||share<0||share>100)throw new RangeError("Delegation percentage must be between 0 and 100.");
 if(!Number.isFinite(weeks)||weeks<1||weeks>52)throw new RangeError("Working weeks must be between 1 and 52.");
 if(value!==null&&(!Number.isFinite(value)||value<0))throw new RangeError("Hourly value must be zero or greater.");
 const weekly=hours*share/100,annual=weekly*weeks,monthly=annual/12;
 return {weekly,monthly,annual,hourValue:value,annualValue:value===null?null:annual*value,remainingAdminHours:hours-weekly};
}

const READINESS_ITEMS=[
 {key:"cv",label:"CV quality and relevance",actions:["Update your CV with accurate, recent experience and a clear structure.","Tailor the opening summary and strongest evidence to one target role."]},
 {key:"role",label:"Target-role clarity",actions:["Choose one or two realistic target job titles.","Compare current vacancies to identify repeated requirements and essential skills."]},
 {key:"tailor",label:"Application tailoring",actions:["Create a repeatable checklist for adapting each application.","Match each important requirement to a genuine example from your experience."]},
 {key:"track",label:"Application tracking",actions:["Create a tracker for roles, deadlines, contacts and follow-ups.","Set a weekly review to update statuses and next actions."]},
 {key:"linkedin",label:"LinkedIn profile",actions:["Refresh your headline, About section and recent experience.","Check that your profile supports the same professional direction as your CV."]},
 {key:"interview",label:"Interview preparation",actions:["Prepare concise examples using situation, action and result.","Practise explaining your motivation, relevant strengths and questions for the employer."]}
];
export function assessJobReadiness(values={}){
 const items=READINESS_ITEMS.map(item=>{
  const value=Number(values[item.key]??0);
  if(!Number.isInteger(value)||value<0||value>2)throw new RangeError("Each readiness answer must be 0, 1 or 2.");
  return {...item,value,status:value===2?"In place":value===1?"Needs attention":"Not yet in place",recommendation:item.actions[value===0?0:1]};
 });
 const total=items.reduce((sum,item)=>sum+item.value,0),percent=Math.round(total/12*100);
 const gaps=items.filter(item=>item.value<2).sort((a,b)=>a.value-b.value);
 return {items,total,percent,grade:percent>=85?"Well organised":percent>=60?"Building a good foundation":percent>=35?"Several important gaps to address":"Start with the essentials",strengths:items.filter(x=>x.value===2),gaps,plan:[
  {week:"Week 1 · Set direction",tasks:["Choose one or two target roles and define the type of opportunity you want.","Review your CV structure and prepare a strong, evidence-based summary.","Identify the essential requirements repeated across suitable vacancies."]},
  {week:"Week 2 · Strengthen your materials",tasks:["Tailor your CV to one suitable vacancy and record the evidence for each key requirement.","Update your LinkedIn headline, About section and experience to support the same positioning.","Prepare three achievement examples using situation, action and result."]},
  {week:"Week 3 · Build a consistent process",tasks:["Set up an application tracker with deadlines and follow-up dates.","Prepare and submit carefully tailored applications rather than applying indiscriminately.","Review your progress and identify where applications are getting stuck."]},
  {week:"Week 4 · Prepare and improve",tasks:["Practise role-specific interview questions and concise evidence-based answers.","Review responses, feedback and application quality; adjust your approach where needed.","Set a realistic weekly routine for applications, networking and follow-up."]}
 ],disclaimer:"This is a self-assessment based on the answers selected. It is not a measure of employability and cannot predict interviews, offers or hiring decisions."};
}

export function buildWeeklyPlan(tasks=[],todayISO=new Date().toISOString().slice(0,10)){
 const today=new Date(todayISO+"T00:00:00");
 if(Number.isNaN(today.getTime()))throw new Error("A valid planning date is required.");
 const end=new Date(today);end.setDate(end.getDate()+7);
 const dateISO=date=>date.toISOString().slice(0,10);
 const groups={overdue:[],dueSoon:[],later:[],undated:[]};
 const sorted=(Array.isArray(tasks)?tasks:[]).filter(t=>t&&typeof t.name==="string"&&t.name.trim()).map((task,index)=>({...task,_index:index}));
 sorted.forEach(task=>{
  const due=task.date?new Date(task.date+"T00:00:00"):null;
  if(!due||Number.isNaN(due.getTime()))groups.undated.push(task);
  else if(due<today)groups.overdue.push(task);
  else if(due<=end)groups.dueSoon.push(task);
  else groups.later.push(task);
 });
 const sortGroup=list=>list.sort((a,b)=>({High:0,Medium:1,Low:2}[String(a.priority||"Medium")]??1)-({High:0,Medium:1,Low:2}[String(b.priority||"Medium")]??1)||(a.date||"9999-12-31").localeCompare(b.date||"9999-12-31")||a._index-b._index);
 Object.values(groups).forEach(sortGroup);
 const owners=unique(sorted.map(t=>String(t.owner||"").trim()).filter(Boolean));
 const missingOwners=sorted.filter(t=>!String(t.owner||"").trim()).length;
 const noDate=groups.undated.length;
 const dependencyFlags=sorted.filter(t=>/\b(after|once|when|waiting for|dependent on|before)\b/i.test(t.name)).map(t=>t.name);
 return {today:dateISO(today),weekEnd:dateISO(end),total:sorted.length,groups,owners,missingOwners,noDate,dependencyFlags,highPriority:sorted.filter(t=>String(t.priority||"").toLowerCase()==="high").length,reviewChecklist:["Confirm the three most important outcomes for the week.","Check overdue work and renegotiate deadlines where necessary.","Assign an owner to every task that needs action.","Break large tasks into clear next actions.","Review progress and move unfinished work deliberately rather than silently carrying it forward."]};
}

export function buildEmailDraft({type="followup",tone="warm",recipient="",sender="",details=""}={}){
 const content=String(details||"").trim();
 if(!content)throw new Error("Add the key details you want the email to communicate.");
 const recipientName=String(recipient||"").trim(),senderName=String(sender||"").trim()||"[Your name]";
 const formal=tone==="formal",concise=tone==="concise";
 const greeting=recipientName?(formal?"Dear "+recipientName+",":"Hello "+recipientName+","):(formal?"Dear [Recipient name],":"Hello,");
 const configs={
  followup:{subject:"Following up",opening:"I am following up on [the matter or conversation] and would appreciate an update when convenient.",closing:"Please let me know if there is any further information I can provide."},
  meeting:{subject:"Meeting request",opening:"I would like to arrange a meeting to discuss the points below and agree on practical next steps.",closing:"Please let me know a suitable date and time, and I will do my best to accommodate."},
  thankyou:{subject:"Thank you",opening:"Thank you for your time and consideration. I appreciated the opportunity to connect.",closing:"I am grateful for your time and look forward to staying in touch."},
  client:{subject:"Project update",opening:"I am writing to provide an update on [project or task] and outline the current position.",closing:"Please let me know if you would like any clarification or if priorities have changed."},
  application:{subject:"Application for [Role title]",opening:"I am writing to express my interest in the [Role title] opportunity at [Organisation].",closing:"I would welcome the opportunity to discuss how my experience aligns with the requirements of the role."}
 };
 const config=configs[type]||configs.followup;
 const detailBlock=content.split(/\n+/).map(x=>x.trim()).filter(Boolean).join("\n\n");
 const close=concise?"Please let me know if you need anything further.":formal?"Please let me know if you require any further information. I look forward to your response.":"Thank you for your time. I look forward to hearing from you.";
 const body=[greeting,"",config.opening,"",detailBlock,"",concise?close:config.closing,"",formal?"Yours sincerely,":"Kind regards,",senderName].join("\n");
 return {subject:config.subject,body:"Subject: "+config.subject+"\n\n"+body};
}

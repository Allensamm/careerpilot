export const SKILLS=['python','javascript','typescript','react','next.js','node.js','fastapi','django','postgresql','sql','aws','docker','kubernetes','java','go','rust','figma','excel','power bi','machine learning','data analysis','html','css','git','graphql','redis','terraform','accounting','bookkeeping','auditing','payroll','financial reporting','budgeting','taxation','quickbooks','customer service','customer support','sales','business development','marketing','digital marketing','seo','social media','content writing','copywriting','recruitment','human resources','talent acquisition','administration','office management','project management','operations','logistics','supply chain','procurement','inventory management','teaching','curriculum development','lesson planning','nursing','patient care','clinical research','public health','pharmacy','civil engineering','mechanical engineering','electrical engineering','autocad','construction','graphic design','ui design','ux design','product management','research','data entry','communication','leadership'];
const GROUPS=[['software engineer','software developer','backend developer','frontend developer','web developer'],['accountant','accounting officer','bookkeeper','finance officer','financial analyst'],['teacher','educator','tutor','instructor'],['nurse','registered nurse','nursing officer'],['administrative assistant','office assistant','office administrator','executive assistant'],['customer support','customer service representative','customer success'],['sales representative','sales executive','account executive','business development'],['marketing specialist','marketing executive','digital marketer','content marketer'],['graphic designer','visual designer','brand designer'],['data analyst','business intelligence analyst','reporting analyst'],['project manager','project coordinator','programme coordinator'],['human resources','hr officer','recruiter','talent acquisition'],['operations manager','operations coordinator','logistics coordinator'],['civil engineer','site engineer','construction engineer']];
const COMMON=new Set(['experience','professional','responsible','responsibilities','skills','strong','excellent','working','ability','knowledge','including','required','preferred','years','using','company','business','support','team','work','role','career','resume','curriculum','vitae','education','university','degree','summary','profile','employment','references','projects','management']);
function terms(text){return new Set(String(text||'').toLowerCase().match(/[a-z]{4,}/g)?.filter(w=>!COMMON.has(w))||[]);}
export function extractSkills(text){const t=' '+String(text||'').toLowerCase().replace(/[^a-z0-9+#.]+/g,' ')+' ';return SKILLS.filter(skill=>t.includes(' '+skill+' '));}
const CATEGORIES={
 technology:['software engineer','software developer','backend','frontend','full stack','web developer','programmer','devops','platform engineer','site reliability engineer','data engineer'],
 finance:['accountant','accounting','bookkeeping','auditor','finance','financial','payroll','taxation'],
 marketing:['marketing','copywriter','copywriting','social media','communications','content writer','seo','brand strategist','campaign manager','public relations'],
 sales:['sales','business development','account executive'],
 healthcare:['nurse','nursing','clinical','patient care','pharmacy','medical'],
 education:['teacher','teaching','tutor','lecturer','curriculum'],
 administration:['administrative','administrator','secretary','office assistant','receptionist'],
 design:['designer','graphic design','figma','ux design','ui design','motion design','vfx'],
 analytics:['data analyst','data analysis','business intelligence','power bi'],
 human_resources:['recruitment','recruiter','human resources','talent acquisition','hr officer'],
 operations:['logistics','supply chain','procurement','warehouse','operations'],
 construction:['civil engineer','construction','architect','autocad'],
 projects:['project manager','project coordinator','programme manager']
};
function categories(text){const t=' '+String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ';return Object.entries(CATEGORIES).filter(([,words])=>words.some(w=>t.includes(' '+w+' '))).map(([name])=>name);}
const FIELD_SKILLS={technology:['python','javascript','typescript','react','node.js','java','docker','kubernetes','aws','git','fastapi'],finance:['accounting','bookkeeping','auditing','payroll','financial reporting','taxation','quickbooks'],marketing:['marketing','digital marketing','seo','social media','content writing','copywriting'],sales:['sales','business development'],healthcare:['nursing','patient care','clinical research','pharmacy'],education:['teaching','lesson planning','curriculum development'],administration:['administration','office management'],design:['graphic design','ui design','ux design','figma'],analytics:['data analysis','power bi','sql'],human_resources:['recruitment','human resources','talent acquisition'],operations:['logistics','supply chain','procurement','inventory management'],construction:['civil engineering','autocad','construction'],projects:['project management']};
export function scoreJob(profile,job){
 const cv=String(profile.cv||'');const title=String(job.title||'');const desc=String(job.description||'').slice(0,3000);
 const cvSkills=profile.skills||extractSkills(cv);const required=extractSkills(title+' '+desc);
 const roleCategories=categories(title),cvCategories=categories(cv+' '+String(profile.role||''));
 for(const [field,skills] of Object.entries(FIELD_SKILLS)){if(skills.filter(skill=>cvSkills.includes(skill)).length>=2&&!cvCategories.includes(field))cvCategories.push(field);}
 const aligned=roleCategories.filter(c=>cvCategories.includes(c));
 const matched=required.filter(s=>cvSkills.includes(s)&&aligned.some(c=>(FIELD_SKILLS[c]||[]).includes(s)));
 const titleTerms=terms(title),cvTerms=terms(cv);
 const overlap=[...titleTerms].filter(t=>cvTerms.has(t));
 const valid=aligned.length>0&&(matched.length>0||overlap.length>=2);
 const score=valid?Math.min(95,55+Math.min(3,matched.length)*10+Math.min(2,overlap.length)*5):0;
 return {score,matched,required,eligibility:'unknown',reason:valid?'Professional field and CV evidence align; eligibility unverified':'Insufficient evidence of role relevance'};
}
export function normalizeGreenhouse(payload,board){if(!payload||!Array.isArray(payload.jobs))throw Error('Unexpected feed');return payload.jobs.filter(x=>Number.isInteger(x.id)&&typeof x.title==='string').slice(0,1000).map(x=>({id:`greenhouse:${board}:${x.id}`,company:board,title:x.title,location:x.location?.name||'Unspecified',url:x.absolute_url,description:stripHtml(x.content||''),source:'greenhouse'})).filter(x=>/^https:\/\/(boards\.greenhouse\.io|job-boards\.greenhouse\.io)\//.test(x.url||''));}
function stripHtml(s){const doc=new DOMParser().parseFromString(String(s),'text/html');return (doc.body.textContent||'').replace(/\s+/g,' ').slice(0,12000);}
export function canSubmit({consent,eligibility,channel,duplicate,unknownAnswers}){if(!consent?.enabled)return 'Autopilot not authorized';if(eligibility!=='eligible')return 'Eligibility not verified';if(!channel?.authorized)return 'No authorized submission channel';if(duplicate)return 'Duplicate application';if(unknownAnswers)return 'Required answers unknown';return null;}

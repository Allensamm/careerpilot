import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSkills,scoreJob,canSubmit} from '../src/core.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('extract skills',()=>assert.deepEqual(extractSkills('Python, React and SQL'),['python','react','sql']));
test('matching does not claim eligibility',()=>{const s=scoreJob({skills:['python'],role:'Backend Engineer'},{title:'Backend Engineer',description:'Python'});assert.equal(s.eligibility,'unknown');assert.equal(s.score,65);});
test('no submission without consent',()=>assert.match(canSubmit({consent:{enabled:false},eligibility:'eligible',channel:{authorized:true}}),/authorized/));
test('unknown eligibility blocks submission',()=>assert.match(canSubmit({consent:{enabled:true},eligibility:'unknown',channel:{authorized:true}}),/verified/));
test('authorized channel required',()=>assert.match(canSubmit({consent:{enabled:true},eligibility:'eligible',channel:null}),/channel/));

test('browser application JavaScript parses before deployment',()=>{
 const source=readFileSync(new URL('../agency.js',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new vm.Script(source));
});
test('resources page includes all six service actions',()=>{
 const html=readFileSync(new URL('../free-tools.html',import.meta.url),'utf8');
 for(const id of ['cv-analyse','li-generate','calculate-time','check-readiness','add-task','draft-email'])assert.match(html,new RegExp('id="'+id+'"'));
});

import {analyzeCV,buildLinkedInPack,calculateTimeSavings,assessJobReadiness,buildWeeklyPlan,buildEmailDraft} from '../src/free-tools.mjs';
import {spawnSync} from 'node:child_process';

test('free tools workspace and browser module pass syntax checks',()=>{
 const paths=['../careerpilot-workspace.js','../src/free-tools.mjs'];
 for(const path of paths){
  const result=spawnSync(process.execPath,['--check',new URL(path,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||('Syntax check failed: '+path));
 }
});
test('CV review identifies sections, measurable evidence and target-role terms',()=>{
 const cv='Alex Morgan\nalex@example.com | +44 7700 900123 | linkedin.com/in/alexmorgan\n\nProfessional Summary\nOperations professional with experience supporting teams and delivering projects.\n\nWork Experience\nOperations Coordinator — Example Ltd\n2021–2025\n• Managed a team of 8 and improved response time by 25%.\n• Streamlined weekly reporting for 4 departments.\n\nEducation\nBA Business Management, 2020\n\nSkills\nProject management, Excel, stakeholder management';
 const result=analyzeCV(cv,'Operations Manager');
 assert.equal(result.wordCount>0,true);
 assert.equal(result.checks.find(x=>x.key==='contact').passed,true);
 assert.equal(result.checks.find(x=>x.key==='experience').passed,true);
 assert.equal(result.metricCount>=1,true);
 assert.equal(result.role,'Operations Manager');
 assert.equal(result.matchedKeywords.includes('operations'),true);
 assert.equal(result.score>40,true);
});
test('CV review handles missing content without inventing facts',()=>{
 const result=analyzeCV('Short profile. Looking for a new opportunity.');
 assert.equal(result.checks.find(x=>x.key==='experience').passed,false);
 assert.equal(result.checks.find(x=>x.key==='role').passed,null);
 assert.match(result.summaryTemplate,/\[Target role\]/);
});
test('LinkedIn pack requires real inputs and returns editable content frameworks',()=>{
 assert.throws(()=>buildLinkedInPack({role:'',skills:'Excel'}),/target role/);
 const result=buildLinkedInPack({role:'Project Manager',industry:'Technology',skills:'Agile, stakeholder management, planning',goal:'lead complex delivery',experience:'Coordinated cross-functional projects.'});
 assert.equal(result.headlineOptions.length,3);
 assert.match(result.about,/Project Manager/);
 assert.equal(result.keywords.includes('Agile'),true);
 assert.equal(result.experienceTemplates.length,3);
 assert.match(result.disclaimer,/do not access your LinkedIn account/);
});
test('productivity calculator validates input and calculates transparent estimates',()=>{
 const result=calculateTimeSavings({adminHours:10,delegatePercent:40,workingWeeks:48,hourValue:25});
 assert.equal(result.weekly,4);
 assert.equal(result.monthly,16);
 assert.equal(result.annual,192);
 assert.equal(result.annualValue,4800);
 assert.throws(()=>calculateTimeSavings({adminHours:169,delegatePercent:40,workingWeeks:48}),/between 0 and 168/);
});
test('job readiness assessment identifies gaps and creates a 30-day plan',()=>{
 const result=assessJobReadiness({cv:2,role:0,tailor:1,track:0,linkedin:1,interview:0});
 assert.equal(result.percent,33);
 assert.equal(result.gaps.length,5);
 assert.equal(result.plan.length,4);
 assert.equal(result.plan[0].week.includes('Week 1'),true);
});
test('weekly task planner prioritises overdue, upcoming, later and undated work',()=>{
 const result=buildWeeklyPlan([
  {name:'Send overdue invoice',date:'2026-10-29',priority:'High',owner:'A'},
  {name:'Prepare proposal',date:'2026-11-02',priority:'Medium',owner:''},
  {name:'Quarterly review',date:'2026-12-01',priority:'Low',owner:'B'},
  {name:'Organise files',date:'',priority:'Low',owner:'A'}
 ],'2026-10-31');
 assert.equal(result.groups.overdue.length,1);
 assert.equal(result.groups.dueSoon.length,1);
 assert.equal(result.groups.later.length,1);
 assert.equal(result.groups.undated.length,1);
 assert.equal(result.missingOwners,1);
});
test('email writer creates a type- and tone-appropriate editable draft',()=>{
 const result=buildEmailDraft({type:'meeting',tone:'formal',recipient:'Jordan',sender:'Alex',details:'Discuss the project timeline.\nReview next steps.'});
 assert.match(result.body,/Dear Jordan/);
 assert.match(result.body,/Meeting request/);
 assert.match(result.body,/project timeline/);
 assert.match(result.body,/Yours sincerely/);
 assert.throws(()=>buildEmailDraft({details:''}),/key details/);
});
test('public free resources page does not expose model or provider details',()=>{
 const html=readFileSync(new URL('../free-tools.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/WebGPU|SmolLM|Qwen3|esm\.run|huggingface\.co|model download|careerpilot-worker/i);
 assert.match(html,/type="module" src="\.\/careerpilot-workspace\.js"/);
 assert.match(html,/src="\.\/agency\.js"/);
 assert.doesNotMatch(html,/AI Email|CareerPilot AI|on-device AI model/i);
});
test('all six resource actions are connected to deterministic handlers',()=>{
 const html=readFileSync(new URL('../free-tools.html',import.meta.url),'utf8');
 const source=readFileSync(new URL('../careerpilot-workspace.js',import.meta.url),'utf8');
 for(const [id,action] of [['cv-analyse','cv'],['li-generate','linkedin'],['calculate-time','time'],['check-readiness','readiness'],['plan-week','tasks'],['draft-email','email']]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*data-work-action="'+action+'"'));
  assert.match(source,new RegExp(action+':do[A-Za-z]+'));
 }
 assert.match(source,/Working/);
 assert.match(source,/aria-busy/);
 assert.doesNotMatch(source,/WebLLM|Qwen3|MLCEngine|esm\.run|navigator\.gpu/i);
});

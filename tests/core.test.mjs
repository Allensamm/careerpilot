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
test('workspace and worker scripts parse before deployment',()=>{
 for(const path of ['../careerpilot-workspace.js','../careerpilot-worker.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:path}));
 }
});
test('public resources page does not disclose its internal implementation',()=>{
 const html=readFileSync(new URL('../free-tools.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/\bAI\b|WebGPU|SmolLM|Qwen3|model download/i);
 assert.match(html,/careerpilot-workspace\.js/);
 assert.doesNotMatch(html,/ai-engine\.js/);
});
test('service actions use the shared model-led planning and review cycle',()=>{
 const html=readFileSync(new URL('../free-tools.html',import.meta.url),'utf8');
 for(const [id,action] of [['cv-analyse','cv'],['li-generate','linkedin'],['calculate-time','time'],['check-readiness','readiness'],['plan-week','tasks'],['draft-email','email']]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*data-work-action="'+action+'"'));
 }
 const source=readFileSync(new URL('../careerpilot-workspace.js',import.meta.url),'utf8');
 assert.match(source,/Qwen3-4B-q4f16_1-MLC/);
 assert.match(source,/Qwen3-4B-q4f32_1-MLC/);
 assert.match(source,/enable_thinking:true/);
 assert.match(source,/async function runAgent/);
 assert.match(source,/independent senior reviewer/);
 assert.match(source,/careerpilot-worker\.js/);
});
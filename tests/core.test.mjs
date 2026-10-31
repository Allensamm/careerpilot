import test from 'node:test';import assert from 'node:assert/strict';import {extractSkills,scoreJob,canSubmit} from '../src/core.mjs';
test('extract skills',()=>assert.deepEqual(extractSkills('Python, React and SQL'),['python','react','sql']));
test('matching does not claim eligibility',()=>{const s=scoreJob({skills:['python'],role:'Backend Engineer'},{title:'Backend Engineer',description:'Python'});assert.equal(s.eligibility,'unknown');assert.equal(s.score,65);});
test('no submission without consent',()=>assert.match(canSubmit({consent:{enabled:false},eligibility:'eligible',channel:{authorized:true}}),/authorized/));
test('unknown eligibility blocks submission',()=>assert.match(canSubmit({consent:{enabled:true},eligibility:'unknown',channel:{authorized:true}}),/verified/));
test('authorized channel required',()=>assert.match(canSubmit({consent:{enabled:true},eligibility:'eligible',channel:null}),/channel/));

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('browser application JavaScript parses before deployment',()=>{
 const source=readFileSync(new URL('../agency.js',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new vm.Script(source));
});
test('free tools page includes all six tool action controls',()=>{
 const html=readFileSync(new URL('../free-tools.html',import.meta.url),'utf8');
 for(const id of ['cv-analyse','li-generate','calculate-time','check-readiness','add-task','draft-email']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
});

import test from 'node:test';import assert from 'node:assert/strict';import {extractSkills,scoreJob,canSubmit} from '../src/core.mjs';
test('extract skills',()=>assert.deepEqual(extractSkills('Python, React and SQL'),['python','react','sql']));
test('matching does not claim eligibility',()=>{const s=scoreJob({skills:['python'],role:'Backend Engineer'},{title:'Backend Engineer',description:'Python'});assert.equal(s.eligibility,'unknown');assert.equal(s.score,100);});
test('no submission without consent',()=>assert.match(canSubmit({consent:{enabled:false},eligibility:'eligible',channel:{authorized:true}}),/authorized/));
test('unknown eligibility blocks submission',()=>assert.match(canSubmit({consent:{enabled:true},eligibility:'unknown',channel:{authorized:true}}),/verified/));
test('authorized channel required',()=>assert.match(canSubmit({consent:{enabled:true},eligibility:'eligible',channel:null}),/channel/));

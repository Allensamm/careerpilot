import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../careerpilot-motion.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../careerpilot-motion.js',import.meta.url),'utf8');

test('professional service positioning is accurate',()=>{
 assert.match(html,/Your experience deserves to be/);
 assert.match(html,/seen differently/);
 assert.match(html,/proprietary AI technology/);
 assert.match(html,/operated internally by our team/);
 assert.match(html,/\$50/);
 assert.match(html,/No customer software login/);
 assert.match(html,/No automatic job applications/);
 assert.match(html,/No promises of recruiter responses/);
 assert.doesNotMatch(html,/guaranteed interviews|fake testimonial|automatic application submission/i);
});

test('links and full editorial section journey exist',()=>{
 for(const [,target] of html.matchAll(/href="([^"]+)"/g)){
   if(target.startsWith('#'))assert.ok(html.includes('id="'+target.slice(1)+'"'),'Missing anchor '+target);
   else if(target.startsWith('/')&&!target.startsWith('//')){
     const path=target.split(/[?#]/)[0];
     const file=path==='/'?'index.html':path.slice(1)+(path.includes('.')?'':'.html');
     assert.ok(existsSync(new URL('../'+file,import.meta.url)),'Missing route '+target);
   }
 }
 for(const id of ['home','problem','platform','how-it-works','examples','deliverables','technology','privacy','pricing','faqs','final']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
});

test('semantic SEO, accessibility and structured data',()=>{
 assert.match(html,/<main id="main">/);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/rel="canonical"/);
 assert.match(html,/"@type":"Service"/);
 assert.match(html,/aria-controls="mobile-nav"/);
 assert.match(html,/role="tablist"/);
 assert.match(html,/role="tabpanel"/);
 assert.ok((html.match(/<details>/g)||[]).length>=5);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/max-width:820px/);
 assert.match(css,/max-width:600px/);
 assert.ok(existsSync(new URL('../robots.txt',import.meta.url)));
 assert.ok(existsSync(new URL('../sitemap.xml',import.meta.url)));
});

test('motion is progressive, modular and syntax-valid',()=>{
 assert.match(html,/gsap@3\.14\.2/);
 assert.match(html,/ScrollTrigger\.min\.js/);
 assert.match(html,/three@0\.158\.0/);
 assert.match(js,/gsap\.context/);
 assert.match(js,/ScrollTrigger/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/prefers-reduced-motion/);
 assert.match(js,/threeCleanup/);
 assert.match(js,/textContent = data\.before/);
 for(const file of ['careerpilot-motion.js','analytics.js']){
   const result=spawnSync(process.execPath,['--check',new URL('../'+file,import.meta.url).pathname],{encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
 }
});

test('brand tokens and safe conversion claims',()=>{
 for(const color of ['#101827','#172A43','#F5F7FA','#fff','#F07845','#8291A3']){
   assert.ok(css.includes(color),'Missing '+color);
 }
 assert.match(html,/IBM\+Plex\+Mono/);
 assert.match(html,/Manrope/);
 assert.match(html,/Inter/);
 assert.match(html,/No payment collected on this page/);
 assert.match(html,/not yet active/);
 assert.match(html,/Do not submit confidential documents/);
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../careerpilot-home.css",import.meta.url),"utf8");

test("CareerPilot accurately presents internal technology and a paid service",()=>{
 assert.match(html,/Your experience deserves to be\s*<em>seen differently/i);
 assert.match(html,/proprietary AI technology/i);
 assert.match(html,/operated internally by our team/i);
 assert.match(html,/do not offer customer software accounts/i);
 assert.match(html,/50.*USD|USD.*ONE-TIME/i);
 assert.match(html,/No\. CareerPilot cannot guarantee/i);
 assert.doesNotMatch(html,/start free trial|fake testimonial|guaranteed job placement/i);
});

test("homepage has correct anchored page journey and local routes",()=>{
 for(const [,target] of html.matchAll(/href="([^"]+)"/g)){
   if(target.startsWith("#")){
     assert.ok(html.includes('id="'+target.slice(1)+'"'),"Missing section "+target);
   }else if(target.startsWith("/") && !target.startsWith("//")){
     const pathname=target.split(/[?#]/)[0];
     const filename=pathname==="/"?"index.html":pathname.slice(1)+(pathname.includes(".")?"":".html");
     assert.ok(existsSync(new URL("../"+filename,import.meta.url)),"Missing route "+target);
   }
 }
 for(const id of ["home","why","platform","how-it-works","examples","deliverables","about","trust","pricing","faqs"]){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
});

test("responsive page maintains proper SEO semantics and accessibility",()=>{
 assert.match(html,/<main id="content">/);
 assert.match(html,/<h1 id="hero-title">/);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/rel="canonical"/);
 assert.match(html,/"@type":"Service"/);
 assert.match(html,/aria-controls="mobile-nav"/);
 assert.match(html,/role="tablist"/);
 assert.ok((html.match(/<details>/g)||[]).length>=5);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/max-width:700px/);
 assert.match(css,/max-width:390px/);
});

test("GSAP, ScrollTrigger and Three.js are integrated as progressive enhancements",()=>{
 assert.match(html,/gsap\/3\.15\.1\/gsap\.min\.js/);
 assert.match(html,/ScrollTrigger\.min\.js/);
 assert.match(html,/careerpilot-orbit\.js/);
 const anim=readFileSync(new URL("../careerpilot-home.js",import.meta.url),"utf8");
 const three=readFileSync(new URL("../careerpilot-orbit.js",import.meta.url),"utf8");
 assert.match(anim,/gsap\.timeline/);
 assert.match(anim,/gsap\.matchMedia\(\)/);
 assert.match(anim,/ScrollTrigger/);
 assert.match(three,/import\("https:\/\/cdn\.jsdelivr\.net\/npm\/three@/);
 assert.match(three,/IntersectionObserver/);
 for(const file of ["careerpilot-home.js","careerpilot-orbit.js"]){
   const r=spawnSync(process.execPath,["--check",new URL("../"+file,import.meta.url).pathname],{encoding:"utf8"});
   assert.equal(r.status,0,file+" syntax error: "+r.stderr);
 }
});

test("homepage uses the approved fintech brand system",()=>{
 for(const colour of ["#101827","#172A43","#F5F7FA","#FFFFFF","#F07845","#8291A3"]){
   assert.ok(css.includes(colour),"Brand colour missing: "+colour);
 }
 assert.match(html,/Manrope/);
 assert.match(html,/Inter/);
 assert.match(html,/IBM\+Plex\+Mono/);
});
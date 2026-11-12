import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,readdirSync} from "node:fs";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import {
 PRICE_CENTS,PRODUCT_NAME,formFields,checkCV,tokenMatches,digest,randomToken,
 stripeVerify,readyForIntake,adminCookie,MAX_CV_BYTES
} from "../lib/assessment.js";

test("checkout has one fixed $50 USD product",()=>{
 assert.equal(PRICE_CENTS,5000);
 assert.equal(PRODUCT_NAME,"CareerPilot Professional Assessment");
 const checkout=readFileSync(new URL("../api/_assessment/checkout.js",import.meta.url),"utf8");
 assert.match(checkout,/client_reference_id:order\.id/);
 assert.match(checkout,/unit_amount/);
 assert.match(checkout,/stripePost/);
 assert.match(checkout,/stripe_session_id/);
 assert.doesNotMatch(checkout,/secretKey.*document|card_number|cardNumber/);
});

test("intake requires full name, validated email, bio, goals and two consents",()=>{
 const fields={fullName:"Morgan Johnson",email:"MORGAN@example.test",
   linkedinUrl:"https://www.linkedin.com/in/morgan-johnson",bio:"Experienced project coordinator supporting teams.",goals:"Move into senior operations coordination.",
   consentProcessing:true,agreeTerms:true};
 const data=formFields(fields);
 assert.equal(data.email,"morgan@example.test");
 assert.equal(data.linkedin_url,fields.linkedinUrl);
 assert.ok(data.consent_at);
 assert.ok(data.terms_accepted_at);
 assert.throws(()=>formFields({...fields,consentProcessing:false}),/Consent/);
 assert.throws(()=>formFields({...fields,email:"not-an-email"}),/email/);
 assert.throws(()=>formFields({...fields,linkedinUrl:"https://evil.com/in/fake"}),/LinkedIn/);
 assert.throws(()=>formFields({...fields,linkedinUrl:"http://www.linkedin.com/in/test"}),/LinkedIn/);
});

test("CV intake validates size, type and magic bytes",()=>{
 const good=Buffer.alloc(400,32);good.write("%PDF-",0);
 assert.deepEqual(checkCV(good,"cv.pdf","application/pdf"),{mime:"application/pdf",ext:"pdf"});
 assert.throws(()=>checkCV(good,"cv.exe","application/pdf"),/filename/);
 assert.throws(()=>checkCV(good,"cv.pdf","application/octet-stream"),/PDF/);
 assert.throws(()=>checkCV(Buffer.alloc(MAX_CV_BYTES+1),"cv.pdf","application/pdf"),/2 MB/);
 assert.throws(()=>checkCV(Buffer.alloc(400),"cv.pdf","application/pdf"),/PDF/);
});

test("capability tokens are high entropy and verified in constant time",()=>{
 const token=randomToken();
 assert.ok(token.length>=40);
 assert.ok(tokenMatches(token,digest(token)));
 assert.ok(!tokenMatches(randomToken(),digest(token)));
 assert.ok(!tokenMatches("",digest(token)));
});

test("Stripe raw-body webhook signatures enforce timestamp and integrity",()=>{
 const raw=Buffer.from(JSON.stringify({type:"checkout.session.completed",data:{object:{id:"demo"}}}));
 const sec="whsec_test_key";
 const ts=Math.floor(Date.now()/1000);
 const signature=crypto.createHmac("sha256",sec).update(String(ts)+".").update(raw).digest("hex");
 const header="t="+ts+",v1="+signature;
 assert.equal(stripeVerify(raw,header,sec).type,"checkout.session.completed");
 assert.throws(()=>stripeVerify(raw,header,"incorrect"),/signature/i);
 assert.throws(()=>stripeVerify(raw,header,sec,Date.now()+3600000),/expired/i);
});

test("intake is OFF unless approved and configured",()=>{
 assert.equal(readyForIntake(),false);
 const code=readFileSync(new URL("../lib/assessment.js",import.meta.url),"utf8");
 for(const secret of ["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","SUPABASE_SERVICE_ROLE_KEY","ASSESSMENT_SCANNER_URL","ASSESSMENT_SCANNER_TOKEN","ADMIN_ALLOWED_EMAILS","ASSESSMENT_POLICY_APPROVED"]){
   assert.match(code,new RegExp(secret));
 }
 assert.match(code,/ASSESSMENT_POLICY_APPROVED==="yes"/);
});

test("private staff sessions use protected cookies",()=>{
 const cookie=adminCookie("testtoken");
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/SameSite=Strict/);
 assert.match(cookie,/Path=\/api\/assessment/);
});

test("sensitive workflow files and endpoints exist",()=>{
 const paths=[
 "assessment.html","assessment.js","assessment.css","assessment-confirmation.html","assessment-confirmation.js",
 "admin.html","assessment-admin.js","assessment-schema.sql","ASSESSMENT_DEPLOYMENT.md",
 "lib/assessment.js","lib/assessment-email.js",
 "api/_assessment/status.js","api/_assessment/create.js","api/_assessment/upload.js",
 "api/_assessment/checkout.js","api/_assessment/webhook.js","api/_assessment/confirmation.js",
 "api/_assessment/maintenance.js","api/_assessment/delete-request.js",
 "api/_assessment/staff/login.js","api/_assessment/staff/logout.js","api/_assessment/staff/me.js",
 "api/_assessment/staff/orders.js","api/_assessment/staff/document.js",
 "api/_assessment/staff/progress.js","api/_assessment/staff/delete.js"
 ];
 for(const file of paths){
   const u=new URL("../"+file,import.meta.url);
   assert.ok(existsSync(u),"Missing implementation file: "+file);
   if(file.endsWith(".js")){
     const r=spawnSync(process.execPath,["--check",u.pathname],{encoding:"utf8"});
     assert.equal(r.status,0,file+" syntax failed: "+r.stderr);
   }
 }
});

test("public form never embeds private secrets or card-number fields",()=>{
 const html=readFileSync(new URL("../assessment.html",import.meta.url),"utf8");
 const script=readFileSync(new URL("../assessment.js",import.meta.url),"utf8");
 assert.match(html,/type="file"/);
 assert.match(html,/type="checkbox" id="consent"/);
 assert.match(html,/type="checkbox" id="terms"/);
 assert.match(script,/checkout/);
 assert.match(script,/stripe/);
 assert.doesNotMatch(html+script,/SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY|sk_live_|whsec_/);
 assert.doesNotMatch(html,/name="cardNumber"|name="cv_url"/);
});

test("Vercel Hobby deployment contains no more than 12 entrypoint functions",()=>{
 const api=new URL("../api/",import.meta.url);
 const count=(url)=>readdirSync(url,{withFileTypes:true}).reduce((n,item)=>{
   if(item.name.startsWith("_") || item.name.startsWith("."))return n;
   if(item.isDirectory())return n+count(new URL(item.name+"/",url));
   return n+(item.name.endsWith(".js")?1:0);
 },0);
 assert.ok(count(api)<=12,"Too many Vercel Function entrypoints: "+count(api));
 const vercel=JSON.parse(readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));
 assert.ok(vercel.rewrites.some(x=>x.source==="/api/assessment/:action" && x.destination.includes("handler=:action")));
 assert.ok(vercel.rewrites.some(x=>x.source==="/api/assessment/staff/:action" && x.destination.includes("handler=staff-:action")));
});



test("assessment router imports every existing secured handler",async()=>{
 const dispatcher=await import("../api/assessment/router.js");
 const req={query:{handler:"not-a-real-route"}};
 const headers={};
 const res={setHeader:(k,v)=>{headers[k]=v;},status:(code)=>{res.code=code;return res;},json:(body)=>{res.body=body;return res;}};
 await dispatcher.default(req,res);
 assert.equal(res.code,404);
 assert.equal(res.body.error,"Not found");
 assert.equal(headers["Cache-Control"],"no-store");
});

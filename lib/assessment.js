import crypto from "node:crypto";

export const PRICE_CENTS = 5000;
export const PRODUCT_NAME = "CareerPilot Professional Assessment";
export const SUPPORT_EMAIL = "bazalel@bazaleldesign.com";
export const STORAGE_BUCKET = "career-assessments-private";
export const MAX_CV_BYTES = 2 * 1024 * 1024;

export function error(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
export function send(res, status, data) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(data);
}
export function handleError(res, e) {
  const status = Number.isInteger(e.status) && e.status >= 400 && e.status < 600 ? e.status : 500;
  if (status === 500) console.error("CareerPilot API error:", e);
  return send(res, status, { error: status === 500 ? "Something went wrong. Please try again later." : e.message });
}
export function onlyMethod(req, method) {
  if (req.method !== method) throw error(405, "Method not allowed");
}
export function siteOrigin() {
  const v = process.env.PUBLIC_SITE_URL || "https://careerpilot-inky.vercel.app";
  const u = new URL(v);
  if (u.protocol !== "https:" && u.hostname !== "localhost") throw error(503, "Site origin is not configured");
  return u.origin;
}
export function requireOrigin(req) {
  if (req.headers.origin !== siteOrigin()) throw error(403, "Request origin not allowed");
}
export function getJson(req) {
  const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  if (!data || typeof data !== "object" || Array.isArray(data) || JSON.stringify(data).length > 24000) {
    throw error(400, "Invalid request data");
  }
  return data;
}
export function readString(s, max = 300) {
  if (typeof s !== "string" || s.length > max) throw error(400, "Invalid text field");
  return s.trim();
}
export function randomToken() { return crypto.randomBytes(32).toString("base64url"); }
export function digest(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
export function tokenMatches(value, hash) {
  if (typeof value !== "string" || value.length < 35 || value.length > 150 || !hash) return false;
  const x = Buffer.from(digest(value)), y = Buffer.from(String(hash));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function uuid(value) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function formFields(data) {
  const name = readString(data.fullName, 150);
  const email = readString(data.email, 254).toLowerCase();
  const linkedin = readString(data.linkedinUrl || "", 520);
  const bio = readString(data.bio, 3500);
  const goals = readString(data.goals, 3500);
  if (name.length < 2) throw error(400, "Please enter your full name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw error(400, "Please enter a valid email");
  if (bio.length < 25) throw error(400, "Your professional bio should contain at least 25 characters");
  if (goals.length < 15) throw error(400, "Please describe your career goals");
  if (linkedin) {
    let parsed;
    try { parsed = new URL(linkedin); } catch { throw error(400, "Invalid LinkedIn profile URL"); }
    if (parsed.protocol !== "https:" || !/^(www\.)?linkedin\.com$/i.test(parsed.hostname) || !/^\/in\/[a-z0-9%_-]+\/?$/i.test(parsed.pathname) || parsed.username || parsed.password) {
      throw error(400, "Please use your LinkedIn profile URL, such as https://www.linkedin.com/in/your-name");
    }
  }
  if (data.consentProcessing !== true || data.agreeTerms !== true) throw error(400, "Consent and terms acceptance are required");
  return { full_name: name, email, linkedin_url: linkedin || null, professional_bio: bio,
    career_goals: goals, consent_at: new Date().toISOString(), terms_accepted_at: new Date().toISOString(),
    consent_version: "2026-11-01" };
}
export function checkCV(buffer, name, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 256 || buffer.length > MAX_CV_BYTES) throw error(400, "Upload a PDF or DOCX no larger than 2 MB");
  if (typeof name !== "string" || name.length > 140 || !/^[a-zA-Z0-9 _().-]+\.(pdf|docx)$/i.test(name)) throw error(400, "Unsupported filename");
  const pdf = /\.pdf$/i.test(name);
  if (pdf && (!buffer.subarray(0,5).equals(Buffer.from("%PDF-")) || mime !== "application/pdf")) throw error(400, "Invalid PDF document");
  if (!pdf && (!buffer.subarray(0,4).equals(Buffer.from([0x50,0x4B,0x03,0x04])) || mime !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || !buffer.includes(Buffer.from("[Content_Types].xml")) || !buffer.includes(Buffer.from("word/document.xml")))) throw error(400, "Invalid DOCX document");
  return { mime, ext: pdf ? "pdf" : "docx" };
}
export async function readRaw(req, max = MAX_CV_BYTES) {
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > max) throw error(413, "File is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function readyForIntake() {
  return ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","PUBLIC_SITE_URL","RATE_LIMIT_SECRET","ASSESSMENT_SCANNER_URL","ASSESSMENT_SCANNER_TOKEN"].every(k=>Boolean(process.env[k]));
}
export async function db(path, opts={}) {
  const base=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw error(503,"Assessment service is being configured");
  const r=await fetch(base+path,{method:opts.method||"GET",headers:{
    apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",
    ...(opts.headers||{})},body:opts.body===undefined?undefined:JSON.stringify(opts.body),cache:"no-store"});
  if (!r.ok) {
    console.error("Storage operation failed",r.status,(await r.text()).slice(0,280));
    throw error(503,"The assessment service is temporarily unavailable");
  }
  const str=await r.text();
  return str ? JSON.parse(str) : null;
}
export async function one(table, filters, select="*") {
  const list=await db("/rest/v1/"+table+"?select="+encodeURIComponent(select)+"&"+filters+"&limit=1");
  return list?.[0]||null;
}
export async function insert(table, item) {
  const rows=await db("/rest/v1/"+table+"?select=*",{method:"POST",body:item,headers:{Prefer:"return=representation"}});
  return rows?.[0]||null;
}
export async function patch(table, filters, item) {
  return await db("/rest/v1/"+table+"?"+filters+"&select=*",{method:"PATCH",body:item,headers:{Prefer:"return=representation"}});
}
export function keyByIP(req, scope) {
  if (!process.env.RATE_LIMIT_SECRET) throw error(503, "Rate limiting isn't configured");
  const address=String(req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  return crypto.createHmac("sha256",process.env.RATE_LIMIT_SECRET).update(scope+":"+address).digest("hex");
}
export async function limit(req, scope, max, windowSeconds) {
  const good=await db("/rest/v1/rpc/assessment_consume_limit",{method:"POST",body:{
    p_key:keyByIP(req,scope),p_max:max,p_window_seconds:windowSeconds}});
  if (good !== true) throw error(429,"Too many requests. Please try again later");
}
export async function getOrder(id, token) {
  if (!uuid(id)) throw error(404,"Assessment request not found");
  const order=await one("assessment_orders","id=eq."+encodeURIComponent(id));
  if (!order || !tokenMatches(token,order.request_token_hash) || Date.parse(order.token_expires_at)<Date.now()) {
    throw error(403,"Assessment access expired or invalid");
  }
  return order;
}
export async function scanCV(buffer, mime) {
  const url=process.env.ASSESSMENT_SCANNER_URL;
  const token=process.env.ASSESSMENT_SCANNER_TOKEN;
  if (!url || !token || new URL(url).protocol!=="https:") throw error(503,"Secure file scanning is not configured");
  const response=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":mime},body:buffer,signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw error(503,"Unable to verify document safety");
  const result=await response.json();
  if(result.clean!==true)throw error(400,"This document could not be accepted; please check the file");
}
export async function storagePut(path,bytes,mime) {
  const base=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response=await fetch(base+"/storage/v1/object/"+STORAGE_BUCKET+"/"+path,{
    method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":mime,"x-upsert":"false"},body:bytes});
  if(!response.ok){console.error("Storage upload error",response.status);throw error(503,"Document upload failed");}
}
export async function storageGet(path) {
  const base=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(base+"/storage/v1/object/"+STORAGE_BUCKET+"/"+path,{headers:{apikey:key,Authorization:"Bearer "+key},cache:"no-store"});
  if(!r.ok)throw error(404,"Document unavailable");
  return Buffer.from(await r.arrayBuffer());
}
export async function storageDelete(path) {
  if(!path)return;
  const base=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(base+"/storage/v1/object/"+STORAGE_BUCKET,{method:"DELETE",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({prefixes:[path]})});
  if(!r.ok)throw error(503,"Document deletion could not be verified");
}
export async function stripePost(path, fields, idempotency) {
  if (!process.env.STRIPE_SECRET_KEY) throw error(503,"Checkout is not yet configured");
  const r=await fetch("https://api.stripe.com/v1/"+path,{method:"POST",headers:{
    Authorization:"Bearer "+process.env.STRIPE_SECRET_KEY,"Content-Type":"application/x-www-form-urlencoded",
    ...(idempotency?{"Idempotency-Key":idempotency}:{})},body:new URLSearchParams(fields)});
  if(!r.ok){console.error("Stripe request error",r.status);throw error(503,"Unable to start secure checkout");}
  return r.json();
}
export async function stripeGet(path) {
  if(!process.env.STRIPE_SECRET_KEY)throw error(503,"Checkout is not configured");
  const r=await fetch("https://api.stripe.com/v1/"+path,{headers:{Authorization:"Bearer "+process.env.STRIPE_SECRET_KEY},cache:"no-store"});
  if(!r.ok)throw error(503,"Unable to verify checkout");
  return r.json();
}
export function stripeVerify(raw, signature, secret, timestamp=Date.now()) {
  if(!signature || !secret)throw error(400,"Missing Stripe signature");
  const pairs=String(signature).split(",").map(k=>k.trim().split("="));
  const t=pairs.find(k=>k[0]==="t")?.[1], sign=pairs.filter(k=>k[0]==="v1").map(k=>k[1]);
  if(!/^\d+$/.test(t||"") || Math.abs(Number(t)*1000-timestamp)>300000)throw error(400,"Stripe signature timestamp expired");
  const expected=crypto.createHmac("sha256",secret).update(t+".").update(raw).digest("hex");
  if(!sign.some(s=>typeof s==="string" && crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(s.padEnd(expected.length).slice(0,expected.length))) && s.length===expected.length))throw error(400,"Invalid Stripe signature");
  return JSON.parse(raw.toString("utf8"));
}
export async function queueNotice(orderId,kind) {
  if(!uuid(orderId))return;
  return db("/rest/v1/assessment_email_outbox?on_conflict=order_id,kind",{method:"POST",
    body:{order_id:orderId,kind,status:"pending",attempts:0},
    headers:{Prefer:"resolution=ignore-duplicates,return=minimal"}});
}
export function escapeHTML(s) {
  return String(s??"").replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
export const noticeContent=(order,kind)=>{
 const name=escapeHTML(order.full_name.split(/\s+/)[0]);
 const support=SUPPORT_EMAIL;
 const templates={
  payment_confirmation:["Payment confirmed","Your $50 CareerPilot Professional Assessment payment has been verified."],
  application_received:["Career profile received","Your assessment request and profile have been received. Our team will review your materials."],
  in_progress:["Your assessment is in progress","Our team is reviewing your professional information and preparing personalised recommendations."],
  completed:["Assessment review completed","Your professional assessment has been completed. Our team will arrange delivery of the results."],
  delivered:["Assessment delivery update","Your assessment results have been marked as delivered. If you haven't received them through the agreed private channel, please contact support."]
 };
 const data=templates[kind];if(!data)throw error(400,"Unsupported notification");
 const html='<div style="font-family:Arial,sans-serif;max-width:560px;color:#101827;line-height:1.7"><h2>'+data[0]+'</h2><p>Hello '+name+',</p><p>'+data[1]+'</p><p>Questions? Email <a href="mailto:'+support+'">'+support+'</a>.</p><p>CareerPilot</p></div>';
 return {subject:"CareerPilot — "+data[0],html};
};
export async function sendNotice(order,kind) {
  if(!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)throw error(503,"Email delivery is not configured");
  const {subject,html}=noticeContent(order,kind);
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{
    Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json",
    "Idempotency-Key":"cp-"+order.id+"-"+kind
  },body:JSON.stringify({from:process.env.EMAIL_FROM,to:[order.email],subject,html})});
  if(!r.ok){console.error("Email provider failure",r.status);throw error(503,"Notification delivery failed");}
  return r.json();
}
export async function adminAuth(req) {
  const cookie=String(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("cp_staff="));
  const bearer=cookie?decodeURIComponent(cookie.slice("cp_staff=".length)):"";
  if(!bearer || bearer.length>6000)throw error(401,"Staff login required");
  const base=process.env.SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.SUPABASE_ANON_KEY;
  if(!base || !key || !process.env.ADMIN_ALLOWED_EMAILS)throw error(503,"Staff authentication is not configured");
  const r=await fetch(base+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+bearer},cache:"no-store"});
  if(!r.ok)throw error(401,"Your session expired. Please sign in again");
  const user=await r.json();
  const allowed=process.env.ADMIN_ALLOWED_EMAILS.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!user?.email_confirmed_at || !allowed.includes(String(user.email||"").toLowerCase()))throw error(403,"Staff access denied");
  return user;
}
export function adminCookie(token,age=3600) {
  const secure=process.env.NODE_ENV!=="development" ? "; Secure" : "";
  return "cp_staff="+encodeURIComponent(token)+"; Path=/api/assessment; HttpOnly; SameSite=Strict; Max-Age="+age+secure;
}
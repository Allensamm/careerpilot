import {createHmac,randomBytes,timingSafeEqual} from "node:crypto";
function parseBody(req){let b=req.body;if(typeof b==="string"){try{return JSON.parse(b);}catch(e){return {};}}return b&&typeof b==="object"?b:{};}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
function dbHeaders(key){return {apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const origin=req.headers.origin,host=req.headers.host;if(origin&&host){try{if(new URL(origin).host!==host)return res.status(403).json({error:"Origin not allowed"});}catch(e){return res.status(403).json({error:"Origin not allowed"});}}
  const code=process.env.DASHBOARD_ACCESS_CODE,secret=process.env.DASHBOARD_SESSION_SECRET,supa=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!code||!secret||secret.length<32||!supa||!key)return res.status(503).json({error:"Dashboard security or database settings are incomplete"});
  const ip=String(req.headers["x-forwarded-for"]||"unknown").split(",")[0].trim(),ipHash=createHmac("sha256",secret).update(ip).digest("hex"),base=supa.replace(/\/+$/,"")+"/rest/v1/";
  try{
    const check=await fetch(base+"analytics_login_attempts?ip_hash=eq."+ipHash+"&select=attempts,window_started_at,blocked_until",{headers:dbHeaders(key)});
    if(!check.ok)return res.status(503).json({error:"Could not verify dashboard access. Try again later."});
    const rows=await check.json(),record=rows[0],now=Date.now();
    if(record&&record.blocked_until&&new Date(record.blocked_until).getTime()>now)return res.status(429).json({error:"Too many attempts. Please wait 15 minutes before trying again."});
    const body=parseBody(req);
    if(!safeEqual(body.code||"",code)){
      const active=record&&now-new Date(record.window_started_at).getTime()<15*60*1000,attempts=active?(Number(record.attempts)||0)+1:1,windowStart=active?record.window_started_at:new Date(now).toISOString(),blocked=attempts>=5?new Date(now+15*60*1000).toISOString():null;
      const save=await fetch(base+"analytics_login_attempts?on_conflict=ip_hash",{method:"POST",headers:{...dbHeaders(key),Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({ip_hash:ipHash,attempts,window_started_at:windowStart,blocked_until:blocked})});
      if(!save.ok)return res.status(503).json({error:"Could not apply access protection. Try again later."});
      return res.status(401).json({error:blocked?"Too many attempts. Access is temporarily locked.":"Incorrect access code."});
    }
    await fetch(base+"analytics_login_attempts?ip_hash=eq."+ipHash,{method:"DELETE",headers:dbHeaders(key)});
    const payload=Buffer.from(JSON.stringify({exp:now+12*60*60*1000,nonce:randomBytes(16).toString("hex")})).toString("base64url"),signature=createHmac("sha256",secret).update(payload).digest("base64url");
    res.setHeader("Set-Cookie","cp_owner_session="+payload+"."+signature+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200");
    return res.status(200).json({ok:true});
  }catch(error){console.error("Dashboard login error",error.message);return res.status(503).json({error:"Dashboard login is temporarily unavailable"});}
}
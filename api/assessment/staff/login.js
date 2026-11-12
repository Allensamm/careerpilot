import {onlyMethod,requireOrigin,getJson,limit,adminCookie,send,handleError,error} from "../../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);await limit(req,"staff-login",5,900);
    const d=getJson(req),email=String(d.email||"").trim().toLowerCase(),password=d.password;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=="string"||password.length<8||password.length>300)throw error(400,"Invalid login credentials");
    const allowed=String(process.env.ADMIN_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase());
    if(!allowed.includes(email))throw error(401,"Invalid login credentials");
    const base=process.env.SUPABASE_URL?.replace(/\/$/,""),anon=process.env.SUPABASE_ANON_KEY;
    if(!base||!anon)throw error(503,"Staff authentication isn't configured");
    const response=await fetch(base+"/auth/v1/token?grant_type=password",{
      method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    if(!response.ok)throw error(401,"Invalid login credentials");
    const data=await response.json();
    if(!data.access_token||String(data.user?.email||"").toLowerCase()!==email||!data.user?.email_confirmed_at)throw error(401,"Staff account not verified");
    const maxAge=Math.min(3600,Math.max(60,Number(data.expires_in)||3600));
    res.setHeader("Set-Cookie",adminCookie(data.access_token,maxAge));
    return send(res,200,{ok:true,email});
  }catch(e){return handleError(res,e);}
}
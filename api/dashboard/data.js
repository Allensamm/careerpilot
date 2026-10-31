import {createHmac,timingSafeEqual} from "node:crypto";
function authorised(req){
  const secret=process.env.DASHBOARD_SESSION_SECRET;if(!secret||secret.length<32)return false;
  const item=String(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("cp_owner_session="));if(!item)return false;
  const parts=item.slice("cp_owner_session=".length).split(".");if(parts.length!==2)return false;
  const expected=createHmac("sha256",secret).update(parts[0]).digest("base64url"),a=Buffer.from(parts[1]),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return false;
  try{return Number(JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")).exp)>Date.now();}catch(e){return false;}
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});if(!authorised(req))return res.status(401).json({error:"Please unlock the dashboard"});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return res.status(503).json({error:"Analytics database is not configured"});
  const cutoff=new Date(Date.now()-90*24*60*60*1000).toISOString(),params=new URLSearchParams({select:"id,visitor_id,session_id,event_name,page_path,page_title,referrer_domain,device_type,browser,os,tool_name,event_label,event_target,duration_seconds,created_at",created_at:"gte."+cutoff,order:"created_at.desc",limit:"10000"});
  try{const response=await fetch(url.replace(/\/+$/,"")+"/rest/v1/analytics_events?"+params.toString(),{headers:{apikey:key,Authorization:"Bearer "+key}});if(!response.ok){const detail=(await response.text()).slice(0,200);console.error("Dashboard data error",response.status,detail);return res.status(503).json({error:"Analytics table is missing or unavailable. Follow DASHBOARD_SETUP.md."});}const events=await response.json();return res.status(200).json({events,window_days:90,generated_at:new Date().toISOString()});}
  catch(error){console.error("Dashboard read error",error.message);return res.status(503).json({error:"Could not load analytics data"});}
}
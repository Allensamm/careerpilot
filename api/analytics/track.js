const EVENTS=new Set(["session_start","page_view","page_time","click","tool_action","form_submit","outbound_click"]);
function text(value,max){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
function classify(ua){
  ua=ua||"";let browser="Other";
  if(/Edg\//i.test(ua))browser="Edge";else if(/SamsungBrowser/i.test(ua))browser="Samsung Internet";else if(/Firefox\//i.test(ua))browser="Firefox";else if(/Chrome\//i.test(ua))browser="Chrome";else if(/Safari\//i.test(ua)&&!/Chrome\//i.test(ua))browser="Safari";
  let os="Other";if(/Windows/i.test(ua))os="Windows";else if(/Android/i.test(ua))os="Android";else if(/iPhone|iPad|iPod/i.test(ua))os="iOS";else if(/Mac OS|Macintosh/i.test(ua))os="macOS";else if(/Linux/i.test(ua))os="Linux";
  let device="Desktop";if(/iPad|Tablet/i.test(ua))device="Tablet";else if(/Mobile|iPhone|Android.*Mobile/i.test(ua))device="Mobile";
  return {browser,os,device};
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return res.status(503).json({error:"Analytics storage is not configured"});
  let body=req.body;if(typeof body==="string"){try{body=JSON.parse(body);}catch(e){return res.status(400).json({error:"Invalid JSON"});}}
  if(!body||typeof body!=="object")return res.status(400).json({error:"Invalid event"});
  const event=text(body.event_name,40);if(!EVENTS.has(event))return res.status(400).json({error:"Unsupported event"});
  const validId=/^[A-Za-z0-9_-]{12,80}$/;const visitor=text(body.visitor_id,80),session=text(body.session_id,80);
  if(!validId.test(visitor)||!validId.test(session))return res.status(400).json({error:"Invalid visitor or session identifier"});
  const ua=req.headers["user-agent"]||"";if(/bot|crawler|spider|preview|headless/i.test(ua))return res.status(204).end();
  const info=classify(ua);let referrerDomain="";try{if(body.referrer)referrerDomain=new URL(String(body.referrer)).hostname.slice(0,120);}catch(e){}
  let page=text(body.page_path,220).split("?")[0].split("#")[0];if(!page.startsWith("/"))page="/";
  const row={visitor_id:visitor,session_id:session,event_name:event,page_path:page,page_title:text(body.page_title,160),referrer_domain:referrerDomain,device_type:info.device,browser:info.browser,os:info.os,tool_name:text(body.tool_name,90),event_label:text(body.event_label,110),event_target:text(body.event_target,180),duration_seconds:event==="page_time"?Math.max(0,Math.min(60,Number(body.duration_seconds)||0)):0};
  try{const response=await fetch(url.replace(/\/+$/,"")+"/rest/v1/analytics_events",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(row)});if(!response.ok){const detail=(await response.text()).slice(0,250);console.error("CareerPilot analytics insert failed",response.status,detail);return res.status(502).json({error:"Could not save analytics event"});}return res.status(204).end();}
  catch(error){console.error("CareerPilot analytics unavailable",error.message);return res.status(502).json({error:"Analytics service unavailable"});}
}
import {db,one,patch,sendNotice} from "./assessment.js";

export async function deliverOutbox({orderId=null,limitCount=12}={}) {
  let path="/rest/v1/assessment_email_outbox?select=*&status=eq.pending&next_attempt_at=lte."
   +encodeURIComponent(new Date().toISOString())
   +"&order=created_at.asc&limit="+Math.min(Math.max(limitCount,1),20);
  if(orderId)path+="&order_id=eq."+encodeURIComponent(orderId);
  const notices=await db(path);
  const result={sent:0,failed:0};
  for(const item of notices||[]){
    try{
      const order=await one("assessment_orders","id=eq."+encodeURIComponent(item.order_id));
      if(!order || order.deleted_at)continue;
      const response=await sendNotice(order,item.kind);
      await patch("assessment_email_outbox","id=eq."+item.id+"&status=eq.pending",{
        status:"sent",sent_at:new Date().toISOString(),
        provider_id:String(response.id||"").slice(0,200)
      });
      result.sent++;
    }catch(e){
      console.error("Email outbox delivery failed",item.id,e.message);
      const retrySeconds=Math.min(3600*12,60*Math.pow(2,Math.min(item.attempts||0,9)));
      await patch("assessment_email_outbox","id=eq."+item.id,{
        attempts:(item.attempts||0)+1,
        next_attempt_at:new Date(Date.now()+retrySeconds*1000).toISOString()
      });
      result.failed++;
    }
  }
  return result;
}
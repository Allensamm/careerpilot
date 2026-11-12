import {onlyMethod,requireOrigin,adminAuth,getJson,uuid,one,patch,queueNotice,send,handleError,error} from "../../../lib/assessment.js";
import {deliverOutbox} from "../../../lib/assessment-email.js";
const next={received:"in_progress",in_progress:"completed",completed:"delivered"};
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);await adminAuth(req);
    const data=getJson(req);
    if(!uuid(data.orderId))throw error(400,"Invalid assessment ID");
    const order=await one("assessment_orders","id=eq."+data.orderId);
    if(!order||order.deleted_at)throw error(404,"Assessment not found");
    if(order.payment_status!=="paid"||next[order.status]!==data.status)throw error(409,"Invalid assessment status transition");
    const fields={status:data.status,last_updated_at:new Date().toISOString()};
    if(data.status==="completed")fields.completed_at=new Date().toISOString();
    if(data.status==="delivered")fields.delivered_at=new Date().toISOString();
    const changed=await patch("assessment_orders","id=eq."+order.id+"&status=eq."+order.status,fields);
    if(!changed?.length)throw error(409,"Status changed; please refresh");
    const notice=data.status==="delivered"?"delivered":data.status;
    await queueNotice(order.id,notice);
    try{await deliverOutbox({orderId:order.id,limitCount:4});}catch(e){console.error("Email delivery queued for retry",e.message);}
    return send(res,200,{ok:true,status:data.status});
  }catch(e){return handleError(res,e);}
}
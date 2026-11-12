import {onlyMethod,requireOrigin,getJson,getOrder,patch,send,handleError,error,limit} from "../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);await limit(req,"delete-request",10,3600);
    const d=getJson(req);
    const order=await getOrder(d.orderId,req.headers["x-assessment-token"]);
    if(order.deleted_at)return send(res,200,{ok:true});
    await patch("assessment_orders","id=eq."+order.id,{
      deletion_requested_at:new Date().toISOString(),status:"deletion_requested",last_updated_at:new Date().toISOString()
    });
    return send(res,200,{ok:true,message:"Deletion request recorded. Staff will review and process it."});
  }catch(e){return handleError(res,e);}
}
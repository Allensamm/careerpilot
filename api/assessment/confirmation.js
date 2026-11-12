import {onlyMethod,limit,stripeGet,one,send,handleError,error,PRICE_CENTS} from "../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"GET");await limit(req,"receipt",30,3600);
    const sessionId=String(req.query.session_id||"");
    if(!/^cs_(test|live)_[a-zA-Z0-9_]{12,}$/.test(sessionId))throw error(400,"Invalid checkout session");
    const session=await stripeGet("checkout/sessions/"+encodeURIComponent(sessionId));
    const order=await one("assessment_orders","stripe_session_id=eq."+encodeURIComponent(sessionId),"id,payment_status,status");
    if(!order||session.client_reference_id!==order.id||session.amount_total!==PRICE_CENTS||
       session.currency!=="usd"||session.payment_status!=="paid")return send(res,200,{paid:false,status:"pending"});
    return send(res,200,{paid:true,status:order.status,order_reference:order.id.slice(0,8).toUpperCase(),
      next_steps:"We will review your career materials and email updates about your assessment.",
      support:"bazalel@bazaleldesign.com"});
  }catch(e){return handleError(res,e);}
}
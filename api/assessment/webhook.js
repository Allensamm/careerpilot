import {onlyMethod,readRaw,stripeVerify,one,patch,queueNotice,send,handleError,PRICE_CENTS,uuid} from "../../lib/assessment.js";
import {deliverOutbox} from "../../lib/assessment-email.js";
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");
    const bytes=await readRaw(req,2000000);
    const event=stripeVerify(bytes,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);
    if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))return send(res,200,{received:true});
    const session=event.data?.object;
    const id=session?.metadata?.assessment_order_id;
    if(!uuid(id) || session.client_reference_id!==id || session.amount_total!==PRICE_CENTS ||
       session.currency!=="usd" || session.mode!=="payment" || session.payment_status!=="paid")return send(res,200,{received:true,ignored:true});
    const order=await one("assessment_orders","id=eq."+id);
    if(!order || order.stripe_session_id!==session.id || !order.cv_storage_key)return send(res,200,{received:true,ignored:true});
    if(order.payment_status==="unpaid"){
      const updated=await patch("assessment_orders","id=eq."+id+"&payment_status=eq.unpaid",{
        payment_status:"paid",status:"received",paid_at:new Date().toISOString(),
        stripe_payment_intent_id:String(session.payment_intent||""),last_updated_at:new Date().toISOString()
      });
      if(updated?.length){
        await queueNotice(id,"payment_confirmation");
        await queueNotice(id,"application_received");
      }
    }
    try{await deliverOutbox({orderId:id,limitCount:4});}catch(e){console.error("Email notices queued for retry",e?.message);}
    return send(res,200,{received:true});
  }catch(e){return handleError(res,e);}
}
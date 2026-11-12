import {onlyMethod,requireOrigin,readyForIntake,limit,getJson,getOrder,stripePost,stripeGet,patch,siteOrigin,PRICE_CENTS,PRODUCT_NAME,send,handleError,error} from "../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);
    if(!readyForIntake())throw error(503,"Secure checkout is not configured");
    await limit(req,"checkout",10,3600);
    const data=getJson(req);
    const order=await getOrder(data.orderId,req.headers["x-assessment-token"]);
    if(order.payment_status!=="unpaid")throw error(409,"Order has already been paid");
    if(!order.cv_storage_key || order.status!=="awaiting_payment")throw error(409,"Complete the secure document upload first");
    if(order.stripe_session_id){
      const existing=await stripeGet("checkout/sessions/"+encodeURIComponent(order.stripe_session_id));
      if(existing.status==="open" && existing.url)return send(res,200,{checkout_url:existing.url});
      throw error(410,"This checkout expired. Start a new assessment request");
    }
    const session=await stripePost("checkout/sessions",{
      mode:"payment",
      "payment_method_types[0]":"card",
      client_reference_id:order.id,
      customer_email:order.email,
      "line_items[0][quantity]":"1",
      "line_items[0][price_data][currency]":"usd",
      "line_items[0][price_data][unit_amount]":String(PRICE_CENTS),
      "line_items[0][price_data][product_data][name]":PRODUCT_NAME,
      "metadata[assessment_order_id]":order.id,
      success_url:siteOrigin()+"/assessment-confirmation?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:siteOrigin()+"/assessment?cancelled=1"
    },"cp-assessment-checkout-"+order.id);
    if(!session?.id||!session?.url)throw error(503,"Checkout session could not be created");
    const updated=await patch("assessment_orders","id=eq."+order.id+"&stripe_session_id=is.null",{stripe_session_id:session.id,last_updated_at:new Date().toISOString()});
    if(!updated?.length)throw error(409,"Another checkout session was created; reload and retry");
    return send(res,200,{checkout_url:session.url});
  }catch(e){return handleError(res,e);}
}
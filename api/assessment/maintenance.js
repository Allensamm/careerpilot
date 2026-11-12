import {onlyMethod,db,patch,storageDelete,send,handleError,error,digest,randomToken} from "../../lib/assessment.js";
import {deliverOutbox} from "../../lib/assessment-email.js";
const days=(d)=>d*86400000;

async function privacyMaintenance(){
  const rows=await db("/rest/v1/assessment_orders?select=*&order=created_at.asc&limit=250");
  const now=Date.now();
  const result={documents_deleted:0,profiles_scrubbed:0,errors:0};
  for(const order of rows||[]){
    try{
      if(order.deleted_at)continue;
      const created=Date.parse(order.created_at);
      const paid=order.paid_at?Date.parse(order.paid_at):null;
      const delivered=order.delivered_at?Date.parse(order.delivered_at):null;
      const requested=Boolean(order.deletion_requested_at);
      const documentExpired=order.cv_storage_key && (
        requested ||
        (order.payment_status==="unpaid" && now-created>days(2)) ||
        (paid && now-paid>days(90)) ||
        (delivered && now-delivered>days(30))
      );
      if(documentExpired){
        await storageDelete(order.cv_storage_key);
        await patch("assessment_orders","id=eq."+order.id,{
          cv_storage_key:null,cv_filename:null,last_updated_at:new Date().toISOString()
        });
        result.documents_deleted++;
      }
      // Financial transaction references are retained separately; CV and profile text are scrubbed.
      const personalDataExpired=requested ||
        (order.payment_status==="unpaid" && now-created>days(7)) ||
        (paid && now-paid>days(180));
      if(personalDataExpired){
        await patch("assessment_orders","id=eq."+order.id,{
          full_name:"[deleted]",email:"deleted-"+order.id+"@invalid.example",
          professional_bio:"[deleted]",career_goals:"[deleted]",linkedin_url:null,
          request_token_hash:digest(randomToken()),token_expires_at:new Date().toISOString(),
          status:"deleted",deleted_at:new Date().toISOString(),last_updated_at:new Date().toISOString()
        });
        result.profiles_scrubbed++;
      }
    }catch(e){console.error("Assessment retention action failed",order.id,e.message);result.errors++;}
  }
  return result;
}
export default async function handler(req,res){
  try{
    onlyMethod(req,"GET");
    if(!process.env.CRON_SECRET || req.headers.authorization!=="Bearer "+process.env.CRON_SECRET)throw error(401,"Unauthorized maintenance request");
    const retention=await privacyMaintenance();
    const notifications=await deliverOutbox({limitCount:20});
    return send(res,200,{retention,notifications});
  }catch(e){return handleError(res,e);}
}
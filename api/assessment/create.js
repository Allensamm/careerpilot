import {randomUUID} from "node:crypto";
import {readyForIntake,onlyMethod,requireOrigin,getJson,formFields,randomToken,digest,insert,limit,send,handleError} from "../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);
    if(!readyForIntake())return send(res,503,{error:"Secure applications are not yet enabled. Please contact CareerPilot before sharing documents."});
    await limit(req,"create",5,3600);
    const info=formFields(getJson(req));
    const id=randomUUID(),token=randomToken();
    await insert("assessment_orders",{
      id,...info,request_token_hash:digest(token),
      token_expires_at:new Date(Date.now()+2*60*60*1000).toISOString()
    });
    return send(res,201,{order_id:id,upload_token:token,expires_in_seconds:7200});
  }catch(e){return handleError(res,e);}
}
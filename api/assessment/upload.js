import {onlyMethod,requireOrigin,readyForIntake,limit,getOrder,readRaw,checkCV,scanCV,storagePut,patch,send,handleError,error} from "../../lib/assessment.js";
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);
    if(!readyForIntake())throw error(503,"Secure uploads are not configured");
    await limit(req,"upload",10,3600);
    const order=await getOrder(req.query.id,req.headers["x-assessment-token"]);
    if(order.status!=="awaiting_document" || order.cv_storage_key)throw error(409,"Document already received");
    let name;
    try{name=decodeURIComponent(String(req.headers["x-file-name"]||""));}catch{throw error(400,"Invalid filename");}
    const mime=String(req.headers["content-type"]||"").split(";")[0].trim();
    const bytes=await readRaw(req);
    const cv=checkCV(bytes,name,mime);
    await scanCV(bytes,cv.mime);
    const key=order.id+"/cv."+cv.ext;
    await storagePut(key,bytes,cv.mime);
    await patch("assessment_orders","id=eq."+order.id+"&status=eq.awaiting_document",{
      cv_storage_key:key,cv_filename:name,cv_uploaded_at:new Date().toISOString(),status:"awaiting_payment",
      last_updated_at:new Date().toISOString()
    });
    return send(res,200,{ok:true,filename:name});
  }catch(e){return handleError(res,e);}
}
import {onlyMethod,adminAuth,one,uuid,storageGet,send,handleError,error} from "../../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"GET");await adminAuth(req);
    const id=String(req.query.id||"");
    if(!uuid(id))throw error(400,"Invalid assessment ID");
    const order=await one("assessment_orders","id=eq."+id);
    if(!order?.cv_storage_key||order.deleted_at)throw error(404,"Document is not available");
    const bytes=await storageGet(order.cv_storage_key);
    const ext=order.cv_storage_key.endsWith(".pdf")?"pdf":"docx";
    res.setHeader("Cache-Control","private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Content-Security-Policy","default-src 'none'; sandbox");
    res.setHeader("Content-Type",ext==="pdf"?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition",'attachment; filename="careerpilot-'+id.slice(0,8)+'.'+ext+'"');
    return res.status(200).send(bytes);
  }catch(e){return handleError(res,e);}
}
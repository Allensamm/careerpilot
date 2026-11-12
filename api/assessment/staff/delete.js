import {onlyMethod,requireOrigin,adminAuth,getJson,uuid,one,storageDelete,patch,send,handleError,error,digest,randomToken} from "../../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"POST");requireOrigin(req);await adminAuth(req);
    const d=getJson(req);
    if(!uuid(d.orderId)||d.confirmDelete!==true)throw error(400,"Confirm the deletion request");
    const order=await one("assessment_orders","id=eq."+d.orderId);
    if(!order)throw error(404,"Assessment not found");
    if(order.deleted_at)return send(res,200,{ok:true,already_deleted:true});
    if(order.cv_storage_key)await storageDelete(order.cv_storage_key);
    const changed=await patch("assessment_orders","id=eq."+order.id,{
      cv_storage_key:null,cv_filename:null,professional_bio:"[deleted]",
      career_goals:"[deleted]",linkedin_url:null,full_name:"[deleted]",
      email:"deleted-"+order.id+"@invalid.example",request_token_hash:digest(randomToken()),
      token_expires_at:new Date().toISOString(),status:"deleted",
      deleted_at:new Date().toISOString(),last_updated_at:new Date().toISOString()
    });
    return send(res,200,{ok:true,document_deleted:true,profile_removed:Boolean(changed?.length)});
  }catch(e){return handleError(res,e);}
}
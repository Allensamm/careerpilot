import {onlyMethod,adminAuth,db,send,handleError} from "../../../lib/assessment.js";
export default async function handler(req,res){
  try{
    onlyMethod(req,"GET");await adminAuth(req);
    const cols="id,full_name,email,linkedin_url,professional_bio,career_goals,cv_filename,cv_storage_key,status,payment_status,created_at,paid_at,completed_at,delivered_at,deleted_at,deletion_requested_at";
    const list=await db("/rest/v1/assessment_orders?select="+encodeURIComponent(cols)+"&order=created_at.desc&limit=100");
    return send(res,200,{orders:list||[]});
  }catch(e){return handleError(res,e);}
}
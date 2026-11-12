import {onlyMethod,adminAuth,send,handleError} from "../../../lib/assessment.js";
export default async function handler(req,res){
  try{onlyMethod(req,"GET");const user=await adminAuth(req);return send(res,200,{authenticated:true,email:user.email});}
  catch(e){return handleError(res,e);}
}
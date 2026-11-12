import {onlyMethod,requireOrigin,adminCookie,send,handleError} from "../../../lib/assessment.js";
export default function handler(req,res){
  try{onlyMethod(req,"POST");requireOrigin(req);res.setHeader("Set-Cookie",adminCookie("",0));return send(res,200,{ok:true});}
  catch(e){return handleError(res,e);}
}
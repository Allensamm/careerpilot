import {readyForIntake,send,onlyMethod,handleError} from "../../lib/assessment.js";
export default async function handler(req,res){
  try{onlyMethod(req,"GET");return send(res,200,{ready:readyForIntake(),price_usd:50,service:"CareerPilot Professional Assessment"});}
  catch(e){return handleError(res,e);}
}
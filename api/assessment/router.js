// One Vercel Function routes the assessment API to existing, independent handlers.
// Vercel Hobby allows only 12 standalone functions for this framework type.
// Original handlers live in api/_assessment/ (a private helper directory).
import status from "../_assessment/status.js";
import create from "../_assessment/create.js";
import upload from "../_assessment/upload.js";
import checkout from "../_assessment/checkout.js";
import webhook from "../_assessment/webhook.js";
import confirmation from "../_assessment/confirmation.js";
import maintenance from "../_assessment/maintenance.js";
import deleteRequest from "../_assessment/delete-request.js";
import staffLogin from "../_assessment/staff/login.js";
import staffLogout from "../_assessment/staff/logout.js";
import staffMe from "../_assessment/staff/me.js";
import staffOrders from "../_assessment/staff/orders.js";
import staffDocument from "../_assessment/staff/document.js";
import staffProgress from "../_assessment/staff/progress.js";
import staffDelete from "../_assessment/staff/delete.js";

const handlers = Object.freeze({
  status,create,upload,checkout,webhook,confirmation,maintenance,
  "delete-request":deleteRequest,
  "staff-login":staffLogin,"staff-logout":staffLogout,
  "staff-me":staffMe,"staff-orders":staffOrders,
  "staff-document":staffDocument,"staff-progress":staffProgress,
  "staff-delete":staffDelete
});

export default async function assessmentRouter(req,res){
  const selected = req.query?.handler;
  const route = typeof selected === "string" ? selected : "";
  if (!Object.hasOwn(handlers,route)) {
    res.setHeader("Cache-Control","no-store");
    return res.status(404).json({error:"Not found"});
  }
  return handlers[route](req,res);
}

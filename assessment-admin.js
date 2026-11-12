/* CareerPilot authorised staff administration — no data in local storage. */
(function(){
"use strict";
const login=document.getElementById("admin-login"),dash=document.getElementById("admin-dashboard");
const status=document.getElementById("admin-status"),emailView=document.getElementById("staff-email");
const tbody=document.getElementById("orders-body"),details=document.getElementById("order-details");
const fields=document.getElementById("order-detail-fields"),message=document.getElementById("action-status");
const dl=document.getElementById("download-cv"),next=document.getElementById("progress-order"),remove=document.getElementById("delete-order");
const transitions={received:"in_progress",in_progress:"completed",completed:"delivered"};
let orders=[],selected=null;

async function request(path,opts={}){
 const r=await fetch("/api/assessment/staff/"+path,{credentials:"same-origin",cache:"no-store",...opts});
 const type=r.headers.get("Content-Type")||"";
 const body=type.includes("application/json")?await r.json():null;
 if(!r.ok)throw new Error(body?.error||"Request unsuccessful");
 return body;
}
function text(el,value){el.textContent=String(value??"");}
function node(tag,value){
 const n=document.createElement(tag);
 if(value!==undefined)text(n,value);
 return n;
}
function setError(message){
 text(status,message);
 status.style.color="#A34538";
}
async function start(){
 try{
   const me=await request("me");
   login.hidden=true;dash.hidden=false;
   text(emailView,"SIGNED IN / "+me.email);
   text(status,"Private session active.");
   await load();
 }catch(e){
   dash.hidden=true;login.hidden=false;
   text(status,"Please sign in with an authorised staff account.");
 }
}
async function load(){
 const d=await request("orders");orders=d.orders||[];
 selected=orders.find(x=>x.id===selected?.id)||null;
 tbody.replaceChildren();
 if(!orders.length){
   const tr=node("tr"),td=node("td","No assessment requests found.");
   td.colSpan=6;tr.appendChild(td);tbody.appendChild(tr);
 }
 for(const item of orders){
   const tr=node("tr");
   tr.classList.toggle("selected",item.id===selected?.id);
   for(const value of [
     item.created_at?new Date(item.created_at).toLocaleDateString():"—",
     item.full_name,
     item.payment_status,
     item.status,
     item.cv_storage_key?"Stored privately":"No document"
   ])tr.appendChild(node("td",value));
   const td=node("td");
   const b=node("button","View");
   b.type="button";b.addEventListener("click",()=>{selected=item;render();});
   td.appendChild(b);tr.appendChild(td);tbody.appendChild(tr);
 }
 render();
}
function render(){
 document.querySelectorAll(".admin-table tbody tr").forEach(tr=>tr.classList.remove("selected"));
 details.hidden=!selected;
 if(!selected)return;
 fields.replaceChildren();
 const display=[
   ["Order ID",selected.id],["Name",selected.full_name],["Email",selected.email],
   ["Payment",selected.payment_status],["Status",selected.status],
   ["LinkedIn",selected.linkedin_url||"Not provided"],
   ["Professional bio",selected.professional_bio],
   ["Career goals",selected.career_goals],
   ["Consent recorded",selected.consent_at||"—"],
   ["CV filename",selected.cv_filename||"No document"]
 ];
 for(const [label,value] of display){
   const p=node("p");const strong=node("strong",label+": ");p.appendChild(strong);
   p.appendChild(document.createTextNode(String(value??"")));fields.appendChild(p);
 }
 dl.disabled=!selected.cv_storage_key||Boolean(selected.deleted_at);
 next.disabled=selected.payment_status!=="paid"||!transitions[selected.status];
 next.textContent=transitions[selected.status]?"Mark "+transitions[selected.status].replaceAll("_"," "):"No further stage";
 remove.disabled=Boolean(selected.deleted_at);
 text(message,selected.deletion_requested_at?"Customer deletion request recorded: action required.":"");
}
document.getElementById("staff-login-form").addEventListener("submit",async event=>{
 event.preventDefault();
 const form=event.currentTarget;const data=new FormData(form);
 text(status,"Verifying staff credentials…");
 try{
   await request("login",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({email:data.get("email"),password:data.get("password")})});
   form.reset();await start();
 }catch(e){setError(e.message);}
});
document.getElementById("refresh").addEventListener("click",()=>load().catch(e=>setError(e.message)));
document.getElementById("logout").addEventListener("click",async()=>{
 try{await request("logout",{method:"POST"});}catch{}
 selected=null;orders=[];dash.hidden=true;login.hidden=false;text(status,"Signed out.");
});
next.addEventListener("click",async()=>{
 if(!selected||!transitions[selected.status])return;
 const target=transitions[selected.status];
 if(!confirm("Mark this assessment as "+target.replaceAll("_"," ")+"? This can send a customer email."))return;
 text(message,"Updating progress…");
 try{
   await request("progress",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({orderId:selected.id,status:target})});
   await load();text(message,"Assessment status updated.");
 }catch(e){text(message,e.message);}
});
dl.addEventListener("click",async()=>{
 if(!selected?.cv_storage_key)return;
 text(message,"Requesting the private CV…");
 try{
   const res=await fetch("/api/assessment/staff/document?id="+encodeURIComponent(selected.id),{credentials:"same-origin",cache:"no-store"});
   if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Download failed");}
   const blob=await res.blob();const url=URL.createObjectURL(blob);
   const a=node("a");a.href=url;a.download=selected.cv_storage_key.endsWith(".pdf")?"assessment-cv.pdf":"assessment-cv.docx";
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),3000);text(message,"Private document downloaded. Handle it according to your retention policy.");
 }catch(e){text(message,e.message);}
});
remove.addEventListener("click",async()=>{
 if(!selected)return;
 const id=selected.id;
 if(!confirm("Permanently remove the customer's CV and professional profile details for order "+id.slice(0,8)+"? Payment records will remain."))return;
 text(message,"Deleting private information…");
 try{
   await request("delete",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({orderId:id,confirmDelete:true})});
   await load();text(message,"Private document and profile details deleted.");
 }catch(e){text(message,e.message);}
});
start();
})();
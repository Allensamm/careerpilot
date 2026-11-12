/* CareerPilot assessment intake — server verifies files and payment. */
(function(){
"use strict";
const form=document.getElementById("assessment-form");
const availability=document.getElementById("availability");
const unavailable=document.getElementById("unavailable");
const status=document.getElementById("form-status");
const submit=document.getElementById("submit-assessment");
let working=false;
const api=(path,opts={})=>fetch("/api/assessment/"+path,{
  credentials:"same-origin",cache:"no-store",...opts
}).then(async response=>{
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Unable to complete this step. Please contact support.");
  return data;
});
function displayError(text){
  status.textContent=text;
  status.style.color="#A34337";
  status.setAttribute("role","alert");
}
function message(text){status.textContent=text;status.style.color="#52677D";status.setAttribute("role","status");}
function setLoading(loading){
  working=loading;
  for(const el of form.elements)el.disabled=loading;
  submit.textContent=loading?"Processing securely…":"Continue to secure checkout — $50 ↗";
}
async function init(){
  try{
    const result=await api("status");
    availability.hidden=true;
    if(result.ready){form.hidden=false;}
    else{unavailable.hidden=false;}
  }catch{
    availability.hidden=true;unavailable.hidden=false;
  }
}
init();
form?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(working)return;
  if(!form.reportValidity())return;
  const file=document.getElementById("cv").files[0];
  if(!file){displayError("Choose a CV document.");return;}
  if(file.size<256 || file.size>2*1024*1024){displayError("Your CV must be a PDF or DOCX up to 2 MB.");return;}
  if(!/\.(pdf|docx)$/i.test(file.name)){displayError("Only PDF and DOCX documents are supported.");return;}
  const values={
    fullName:document.getElementById("full-name").value,
    email:document.getElementById("email").value,
    linkedinUrl:document.getElementById("linkedin-url").value,
    bio:document.getElementById("bio").value,
    goals:document.getElementById("goals").value,
    consentProcessing:document.getElementById("consent").checked,
    agreeTerms:document.getElementById("terms").checked
  };
  setLoading(true);
  try{
    message("Creating your private assessment request…");
    const created=await api("create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
    message("Scanning and saving your CV securely…");
    const mime=/\.pdf$/i.test(file.name)?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    await api("upload?id="+encodeURIComponent(created.order_id),{
      method:"POST",headers:{"Content-Type":mime,"X-File-Name":encodeURIComponent(file.name),"X-Assessment-Token":created.upload_token},body:file
    });
    message("Opening secure Stripe checkout…");
    const checkout=await api("checkout",{method:"POST",headers:{
      "Content-Type":"application/json","X-Assessment-Token":created.upload_token
    },body:JSON.stringify({orderId:created.order_id})});
    if(!checkout.checkout_url || !/^https:\/\/checkout\.stripe\.com\//.test(checkout.checkout_url)){
      throw new Error("Checkout did not return a verified Stripe payment address.");
    }
    window.location.assign(checkout.checkout_url);
  }catch(e){
    displayError(e.message+" If you need help, email bazalel@bazaleldesign.com. Don't send files through public links.");
    setLoading(false);
  }
});
})();
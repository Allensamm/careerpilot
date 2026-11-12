/* CareerPilot Stripe return — the server verifies payment status. */
(async function(){
  "use strict";
  const status=document.getElementById("confirmation-status");
  const box=document.getElementById("receipt-detail");
  const details=document.getElementById("receipt-text");
  const id=new URLSearchParams(location.search).get("session_id");
  if(!id || !/^cs_(test|live)_[a-zA-Z0-9_]{12,}$/.test(id)){
    status.textContent="No checkout reference was provided. Please return to CareerPilot or contact support.";
    return;
  }
  try{
    const response=await fetch("/api/assessment/confirmation?session_id="+encodeURIComponent(id),{cache:"no-store",credentials:"same-origin",referrerPolicy:"no-referrer"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Payment verification failed");
    if(data.paid){
      status.textContent="Your $50 payment has been verified. Thank you for choosing CareerPilot.";
      box.hidden=false;
      details.textContent="Order reference: "+data.order_reference+". Please keep this reference for support requests. Our team will communicate next steps by email.";
    }else{
      status.textContent="Your checkout hasn't been confirmed yet. If you completed payment, check your email or contact support with your Stripe receipt.";
    }
  }catch{
    status.textContent="We couldn't verify the checkout at this moment. If you paid, please contact support with your payment receipt.";
  }
})();
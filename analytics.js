(function(){
  "use strict";
  if(location.pathname.replace(/\/$/,"")==="/dashboard")return;
  var CONSENT_KEY="cp_analytics_consent";
  var API="/api/analytics/track";
  function node(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
  function showConsent(){
    if(document.getElementById("cp-analytics-consent"))return;
    var box=node("section","cp-consent");box.id="cp-analytics-consent";box.setAttribute("aria-label","Analytics preferences");
    var copy=node("div","cp-consent-copy");
    copy.appendChild(node("strong","","Help us improve CareerPilot"));
    copy.appendChild(node("p","","We use anonymous website analytics to understand which pages and free tools are useful. We record page visits, general device and browser categories, and interactions—not form contents, CV text or names."));
    var actions=node("div","cp-consent-actions");
    var accept=node("button","cp-consent-accept","Accept analytics");accept.type="button";
    var reject=node("button","cp-consent-reject","Reject");
    actions.appendChild(reject);actions.appendChild(accept);box.appendChild(copy);box.appendChild(actions);
    document.body.appendChild(box);
    accept.addEventListener("click",function(){try{localStorage.setItem(CONSENT_KEY,"yes");}catch(e){}box.remove();start();});
    reject.addEventListener("click",function(){try{localStorage.setItem(CONSENT_KEY,"no");}catch(e){}box.remove();});
  }
  function safeStore(store,key,value){try{store.setItem(key,value);return true;}catch(e){return false;}}
  function readStore(store,key){try{return store.getItem(key);}catch(e){return null;}}
  function uuid(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():"cp-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);}
  function start(){
    if(window.__careerPilotAnalyticsStarted)return;window.__careerPilotAnalyticsStarted=true;
    var visitor=readStore(localStorage,"cp_analytics_visitor");
    if(!visitor){visitor=uuid();safeStore(localStorage,"cp_analytics_visitor",visitor);}
    var session=readStore(sessionStorage,"cp_analytics_session");
    if(!session){session=uuid();safeStore(sessionStorage,"cp_analytics_session",session);}
    var lastBeat=Date.now(),lastVisible=!document.hidden;
    function send(name,extra){
      if(readStore(localStorage,CONSENT_KEY)!=="yes")return;
      var payload={visitor_id:visitor,session_id:session,event_name:name,page_path:location.pathname,page_title:document.title,referrer:document.referrer||"",duration_seconds:extra&&extra.duration_seconds?extra.duration_seconds:0,tool_name:extra&&extra.tool_name?extra.tool_name:"",event_label:extra&&extra.event_label?extra.event_label:"",event_target:extra&&extra.event_target?extra.event_target:""};
      try{fetch(API,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:!!(extra&&extra.keepalive)}).catch(function(){});}catch(e){}
    }
    send("session_start");send("page_view");
    function flushTime(force){if(document.hidden&&!force)return;var now=Date.now(),seconds=Math.max(0,Math.min(60,Math.round((now-lastBeat)/1000)));lastBeat=now;if(seconds>0)send("page_time",{duration_seconds:seconds});}
    var timer=window.setInterval(flushTime,15000);
    document.addEventListener("visibilitychange",function(){if(document.hidden){flushTime(true);lastVisible=false;}else{lastBeat=Date.now();lastVisible=true;}});
    window.addEventListener("pagehide",function(){if(timer)clearInterval(timer);if(lastVisible){var seconds=Math.max(0,Math.min(60,Math.round((Date.now()-lastBeat)/1000)));if(seconds)send("page_time",{duration_seconds:seconds,keepalive:true});}});
    document.addEventListener("click",function(event){
      var target=event.target&&event.target.closest?event.target.closest("a,button,[role='button'],input[type='submit']"):null;if(!target)return;
      var label=(target.getAttribute("aria-label")||target.getAttribute("title")||target.innerText||target.value||"").replace(/\s+/g," ").trim().slice(0,90);
      var scope=target.closest("[data-tool],[data-planner-id],section[id],article[id],.planner-card,.digital-planner-card");
      var heading=scope&&scope.querySelector?scope.querySelector("h2,h3,h4"):null;var rawTool=scope?(scope.getAttribute("data-tool")||scope.getAttribute("data-planner-id")||scope.id||(heading?heading.textContent:"")):"";
      var path=(location.pathname+" "+rawTool+" "+(scope?scope.className:"")).toLowerCase();
      var isTool=/cv-health|linkedin-tool|time-calculator|job-readiness|task-planner|email-assistant|planner|digital-tool/.test(path);
      var targetPath="";if(target.tagName==="A"){try{var u=new URL(target.href,location.href);targetPath=u.origin===location.origin?u.pathname:u.hostname;}catch(e){}}
      send(isTool?"tool_action":(target.tagName==="A"&&target.hostname!==location.hostname?"outbound_click":"click"),{tool_name:isTool?(rawTool||location.pathname.split("/").pop()||"free-tool"):"",event_label:label,event_target:targetPath});
    },true);
    document.addEventListener("submit",function(event){var form=event.target;if(!form||form.tagName!=="FORM")return;var scope=form.closest("[data-tool],section[id]");var tool=(form.getAttribute("data-tool")||form.id||(scope&&scope.id)||"form").slice(0,80);send("form_submit",{tool_name:tool,event_label:"Form submitted"});},true);
  }
  var choice=readStore(localStorage,CONSENT_KEY);
  if(choice==="yes")start();else if(choice!=="no"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",showConsent,{once:true});else showConsent();}
})();
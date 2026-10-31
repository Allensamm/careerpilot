(function(){
"use strict";
var $=function(id){return document.getElementById(id);},events=[];
function request(url,options){options=options||{};options.credentials="same-origin";options.headers=Object.assign({"Content-Type":"application/json"},options.headers||{});return fetch(url,options);}
function setStatus(message,error){var el=$("dashboard-status");if(el){el.textContent=message||"";el.classList.toggle("error",!!error);}}
function loginStatus(message){$("login-status").textContent=message||"";}
function showLogin(){$("login-screen").hidden=false;$("dashboard-app").hidden=true;}
function showDashboard(){$("login-screen").hidden=true;$("dashboard-app").hidden=false;}
function unique(list){return Array.from(new Set(list));}
function fmtTime(seconds){seconds=Math.max(0,Math.round(seconds||0));if(seconds<60)return seconds+"s";return Math.floor(seconds/60)+"m "+seconds%60+"s";}
function countMap(items,keyFn){var map={};items.forEach(function(item){var key=keyFn(item)||"Unknown";map[key]=(map[key]||0)+1;});return map;}
function make(tag,cls,text){var el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function renderRank(id,entries){var root=$(id);root.replaceChildren();if(!entries.length){root.appendChild(make("div","empty-note","No activity recorded for this period yet. Visitors who accept analytics will appear here."));return;}var max=Math.max.apply(null,entries.map(function(x){return x.value;}))||1;entries.slice(0,8).forEach(function(item){var row=make("div","rank-row");row.appendChild(make("div","rank-name",item.label));row.appendChild(make("div","rank-value",String(item.value)));var track=make("div","rank-track"),fill=make("span");fill.style.width=Math.max(2,Math.round(item.value/max*100))+"%";track.appendChild(fill);row.appendChild(track);root.appendChild(row);});}
function getPeriodEvents(){var days=Number($("range-filter").value)||30,cutoff=Date.now()-days*86400000;return events.filter(function(e){return new Date(e.created_at).getTime()>=cutoff;});}
function render(){
 var list=getPeriodEvents(),views=list.filter(function(e){return e.event_name==="page_view";}),times=list.filter(function(e){return e.event_name==="page_time";});
 var sessions=unique(list.map(function(e){return e.session_id;})),visitors=unique(list.map(function(e){return e.visitor_id;})),visitorSessions={};
 list.forEach(function(e){visitorSessions[e.visitor_id]=visitorSessions[e.visitor_id]||{};visitorSessions[e.visitor_id][e.session_id]=true;});
 var returning=Object.keys(visitorSessions).filter(function(id){return Object.keys(visitorSessions[id]).length>1;}).length,seconds=times.reduce(function(sum,e){return sum+(Number(e.duration_seconds)||0);},0);
 $("stat-visitors").textContent=visitors.length.toLocaleString();$("stat-sessions").textContent=sessions.length.toLocaleString();$("stat-views").textContent=views.length.toLocaleString();$("stat-time").textContent=fmtTime(sessions.length?seconds/sessions.length:0);$("stat-returning").textContent=returning.toLocaleString();
 var daily={},days=Number($("range-filter").value)||30,chartDays=Math.min(14,days);
 for(var i=chartDays-1;i>=0;i--){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);daily[d.toISOString().slice(0,10)]=0;}
 views.forEach(function(e){var k=String(e.created_at).slice(0,10);if(Object.prototype.hasOwnProperty.call(daily,k))daily[k]++;});
 var chart=$("traffic-chart");chart.replaceChildren();var maxView=Math.max(1,...Object.values(daily));
 Object.keys(daily).forEach(function(k){var cell=make("div","traffic-day");cell.appendChild(make("b","",String(daily[k])));var p=document.createElement("progress");p.max=maxView;p.value=daily[k];p.setAttribute("aria-label",k+": "+daily[k]+" page views");cell.appendChild(p);cell.appendChild(make("small","",k.slice(5)));chart.appendChild(cell);});
 var pageCounts=countMap(views,function(e){return e.page_path;});renderRank("pages-list",Object.keys(pageCounts).map(function(k){return {label:k,value:pageCounts[k]};}).sort(function(a,b){return b.value-a.value;}));
 var toolEvents=list.filter(function(e){return e.event_name==="tool_action"||e.event_name==="form_submit";}),toolCounts=countMap(toolEvents,function(e){return e.tool_name||"Other tool activity";});
 renderRank("tools-list",Object.keys(toolCounts).map(function(k){return {label:k,value:toolCounts[k]};}).sort(function(a,b){return b.value-a.value;}));
 var firstBySession={};list.forEach(function(e){if(!firstBySession[e.session_id]||new Date(e.created_at)<new Date(firstBySession[e.session_id].created_at))firstBySession[e.session_id]=e;});
 var sources=countMap(Object.keys(firstBySession).map(function(k){return firstBySession[k];}),function(e){return e.referrer_domain||"Direct / unknown";});
 renderRank("sources-list",Object.keys(sources).map(function(k){return {label:k,value:sources[k]};}).sort(function(a,b){return b.value-a.value;}));
 var deviceMap={},browserMap={};list.forEach(function(e){if(!deviceMap[e.session_id])deviceMap[e.session_id]=e.device_type||"Unknown";if(!browserMap[e.session_id])browserMap[e.session_id]=e.browser||"Unknown";});
 var devices=countMap(Object.keys(deviceMap).map(function(k){return deviceMap[k];}),function(x){return x;}),browsers=countMap(Object.keys(browserMap).map(function(k){return browserMap[k];}),function(x){return x;});
 renderRank("devices-list",Object.keys(devices).map(function(k){return {label:k,value:devices[k]};}).sort(function(a,b){return b.value-a.value;}));
 renderRank("browsers-list",Object.keys(browsers).map(function(k){return {label:k,value:browsers[k]};}).sort(function(a,b){return b.value-a.value;}));
 var actions=countMap(list.filter(function(e){return e.event_name!=="page_time"&&e.event_name!=="page_view"&&e.event_name!=="session_start";}),function(e){return e.event_name.replace(/_/g," ");});
 renderRank("actions-list",Object.keys(actions).map(function(k){return {label:k,value:actions[k]};}).sort(function(a,b){return b.value-a.value;}));
 renderSessions(list);setStatus(list.length?"Showing "+list.length.toLocaleString()+" anonymous activity events. Last refreshed "+new Date().toLocaleTimeString()+".":"No visitor activity is available yet. Visitors who accept analytics will appear here.",false);
}
function renderSessions(list){
 var root=$("sessions-list");root.replaceChildren();var groups={};list.forEach(function(e){(groups[e.session_id]||(groups[e.session_id]=[])).push(e);});
 var ids=Object.keys(groups).sort(function(a,b){return new Date(groups[b][0].created_at)-new Date(groups[a][0].created_at);}).slice(0,35);
 if(!ids.length){root.appendChild(make("div","empty-note","No sessions yet. Visit the public website from a browser that has accepted analytics to create a test session."));return;}
 ids.forEach(function(id){
  var rows=groups[id].slice().sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);}),first=rows[0],details=make("details","session-item"),summary=document.createElement("summary"),main=make("div","session-main");
  main.appendChild(make("strong","","Visitor "+String(first.visitor_id).slice(0,8)+" · "+(first.device_type||"Unknown")+" · "+(first.browser||"Unknown")));
  main.appendChild(make("small","",new Date(first.created_at).toLocaleString()+" · "+unique(rows.filter(function(e){return e.event_name==="page_view";}).map(function(e){return e.page_path;})).length+" pages"));
  summary.appendChild(main);summary.appendChild(make("span","session-meta",fmtTime(rows.reduce(function(s,e){return s+(Number(e.duration_seconds)||0);},0))+" engaged"));details.appendChild(summary);
  var journey=make("ol","journey-list");rows.forEach(function(e){if(e.event_name==="page_time")return;var label=e.event_name==="page_view"?"Viewed "+e.page_path:e.event_name==="tool_action"?"Used "+(e.tool_name||"a tool")+(e.event_label?" · "+e.event_label:""):e.event_name==="form_submit"?"Submitted "+(e.tool_name||"a form"):e.event_name.replace(/_/g," ")+(e.event_label?" · "+e.event_label:"");var li=make("li","",label);li.appendChild(make("time","",new Date(e.created_at).toLocaleTimeString()));journey.appendChild(li);});
  details.appendChild(journey);root.appendChild(details);
 });
}
async function loadData(){
 setStatus("Refreshing visitor activity…",false);
 try{var response=await request("/api/dashboard/data",{method:"GET",headers:{}});if(response.status===401){showLogin();return;}var data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load dashboard.");events=Array.isArray(data.events)?data.events:[];showDashboard();render();}
 catch(error){showDashboard();setStatus(error.message||"Dashboard could not load.",true);}
}
$("login-form").addEventListener("submit",async function(event){
 event.preventDefault();var button=$("login-button"),code=$("access-code").value.trim();button.disabled=true;button.textContent="Checking access…";loginStatus("");
 try{var response=await request("/api/dashboard/login",{method:"POST",body:JSON.stringify({code:code})}),data=await response.json();if(!response.ok)throw new Error(data.error||"Could not unlock dashboard.");$("access-code").value="";showDashboard();await loadData();}
 catch(error){loginStatus(error.message||"Access could not be verified.");}
 finally{button.disabled=false;button.textContent="Unlock dashboard";}
});
$("refresh-button").addEventListener("click",loadData);$("range-filter").addEventListener("change",render);
$("logout-button").addEventListener("click",async function(){try{await request("/api/dashboard/logout",{method:"POST",body:"{}"});}catch(e){}events=[];showLogin();loginStatus("Dashboard locked.");});
$("export-button").addEventListener("click",function(){var list=getPeriodEvents(),cols=["created_at","event_name","visitor_id","session_id","page_path","page_title","referrer_domain","device_type","browser","os","tool_name","event_label","event_target","duration_seconds"],csv=[cols.join(",")].concat(list.map(function(e){return cols.map(function(k){return '"'+String(e[k]===undefined?"":e[k]).replace(/"/g,'""')+'"';}).join(",");})).join("\r\n"),blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="careerpilot-anonymous-analytics.csv";a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);});
loadData();
})();
const BASE='http://127.0.0.1:8765';
let token=null;
async function request(path,method='GET',body){
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization=`Bearer ${token}`;
  const res=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit'});
  const data=await res.json();if(!res.ok)throw Error(data.error||`Agent HTTP ${res.status}`);return data;
}
export const health=()=>request('/v1/health');
export async function pair(code){if(!/^\d{6}$/.test(code))throw Error('Enter the six-digit code shown in the agent terminal');const result=await request('/v1/pair','POST',{code});token=result.token;return result;}
export const queueJob=id=>request('/v1/queue','POST',{jobId:id});
export const listQueue=()=>request('/v1/queue');
export async function unpair(){try{if(token)await request('/v1/unpair','POST',{});}finally{token=null;}}
export function isPaired(){return !!token;}

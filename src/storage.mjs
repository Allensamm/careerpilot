const DB='careerpilot-local-v1',STORE='records';
function connect(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});}
async function operation(mode,callback){const db=await connect();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const req=callback(tx.objectStore(STORE));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
export const get=(key)=>operation('readonly',s=>s.get(key));
export const set=(key,value)=>operation('readwrite',s=>s.put(value,key));
export const remove=(key)=>operation('readwrite',s=>s.delete(key));
export async function clearAll(){const db=await connect();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}

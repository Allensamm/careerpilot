// Local-only encrypted vault. Passphrase never leaves browser memory.
const DB='careerpilot-encrypted-v1', STORE='encrypted', enc=new TextEncoder(), dec=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function dbOpen(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function op(mode,fn){const db=await dbOpen();try{return await new Promise((ok,no)=>{const tx=db.transaction(STORE,mode);const req=fn(tx.objectStore(STORE));req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error);tx.onerror=()=>no(tx.error);});}finally{db.close();}}
const read=k=>op('readonly',s=>s.get(k));const write=(k,v)=>op('readwrite',s=>s.put(v,k));
const erase=()=>op('readwrite',s=>s.clear());
let key=null;
async function derive(pass,salt){const material=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function seal(k,value,associated){const iv=crypto.getRandomValues(new Uint8Array(12));const data=enc.encode(JSON.stringify(value));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(associated)},k,data);return {iv:b64(iv),ciphertext:b64(ciphertext)};}
async function open(k,record,associated){const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(record.iv),additionalData:enc.encode(associated)},k,un64(record.ciphertext));return JSON.parse(dec.decode(plain));}
export async function vaultExists(){return !!(await read('__meta'));}
export async function createVault(pass){if(await vaultExists())throw Error('Vault already exists');if(pass.length<12)throw Error('Passphrase must have at least 12 characters');const salt=crypto.getRandomValues(new Uint8Array(16));const derived=await derive(pass,salt);const check=await seal(derived,{ok:true},'__check');await write('__meta',{salt:b64(salt),check,version:1});key=derived;}
export async function unlockVault(pass){const meta=await read('__meta');if(!meta)throw Error('Create a vault first');const derived=await derive(pass,un64(meta.salt));try{const test=await open(derived,meta.check,'__check');if(!test.ok)throw Error('Invalid vault');}catch{throw Error('Incorrect passphrase or damaged vault');}key=derived;}
export function lockVault(){key=null;}
export function isUnlocked(){return key!==null;}
export async function vaultGet(k){if(!key)throw Error('Vault locked');const r=await read('record:'+k);return r?open(key,r,'record:'+k):null;}
export async function vaultSet(k,v){if(!key)throw Error('Vault locked');await write('record:'+k,await seal(key,v,'record:'+k));}
export async function deleteVault(){key=null;await erase();}
export async function exportEncryptedVault(){const meta=await read('__meta');if(!meta)throw Error('No vault');const records={};for(const k of ['profile','policy','jobs']){const v=await read('record:'+k);if(v)records[k]=v;}return JSON.stringify({format:'careerpilot-vault',version:1,meta,records},null,2);}
export async function importEncryptedVault(json){const v=JSON.parse(json);if(v.format!=='careerpilot-vault'||v.version!==1||!v.meta?.salt||!v.meta?.check||!v.records||typeof v.records!=='object')throw Error('Invalid vault export');if(await vaultExists())throw Error('Erase existing vault before importing');for(const [k,r] of Object.entries(v.records)){if(!['profile','policy','jobs'].includes(k)||typeof r.iv!=='string'||typeof r.ciphertext!=='string')throw Error('Invalid encrypted record');}await write('__meta',v.meta);for(const [k,r] of Object.entries(v.records))await write('record:'+k,r);}

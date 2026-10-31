export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const origin=req.headers.origin,host=req.headers.host;
  if(origin&&host){try{if(new URL(origin).host!==host)return res.status(403).json({error:"Origin not allowed"});}catch(e){return res.status(403).json({error:"Origin not allowed"});}}
  res.setHeader("Set-Cookie","cp_owner_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  return res.status(200).json({ok:true});
}
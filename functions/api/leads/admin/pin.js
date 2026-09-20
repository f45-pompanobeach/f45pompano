import {adminAuthorized,getAdminPinHash,json,setAdminPin} from '../_shared.js';
export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const code=String(body.new_code||'').trim();
  if(!/^\d{4}$/.test(code))return json({ok:false,error:'invalid_code',message:'Super Admin code must be exactly 4 digits.'},400);
  await setAdminPin(env,code);
  const hash=await getAdminPinHash(env);
  const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
  headers.append('set-cookie',`f45_admin_session=${hash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
  return new Response(JSON.stringify({ok:true}),{status:200,headers});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

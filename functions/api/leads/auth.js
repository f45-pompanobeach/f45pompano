import {adminAuthorized,authThrottle,eventForStaffCode,getAdminPinHash,json,recordAuthFailure,recordAuthSuccess,sha256Hex,staffEventFromRequest} from './_shared.js';

export async function onRequestPost({request,env}){
  const throttle=await authThrottle(env,request);
  if(throttle.blocked)return json({ok:false,error:'rate_limited',message:`Too many failed attempts. Try again in about ${Math.ceil(throttle.retry_after/60)} minute${Math.ceil(throttle.retry_after/60)===1?'':'s'}.`,retry_after:throttle.retry_after},429);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const code=String(body.code||'').trim();
  if(!/^\d{4}$/.test(code)){await recordAuthFailure(env,request);return json({ok:false,error:'invalid_code',message:'Enter a 4-digit code.'},400)}
  const synthetic=new Request(request.url,{headers:{'x-table-code':code}});
  if(await adminAuthorized(synthetic,env)){
    await recordAuthSuccess(env,request);
    const hash=await getAdminPinHash(env);
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
    headers.append('set-cookie',`f45_admin_session=${hash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    headers.append('set-cookie','f45_event_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(JSON.stringify({ok:true,role:'admin'}),{status:200,headers});
  }
  const event=await eventForStaffCode(env,code);
  if(event){
    await recordAuthSuccess(env,request);
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
    headers.append('set-cookie',`f45_event_session=${await sha256Hex(code)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    headers.append('set-cookie','f45_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(JSON.stringify({ok:true,role:'event',event}),{status:200,headers});
  }
  const fail=await recordAuthFailure(env,request);
  if(Number(fail?.locked_until)>0)return json({ok:false,error:'rate_limited',message:'Too many failed attempts. Try again in about 15 minutes.',retry_after:900},429);
  return json({ok:false,error:'unauthorized',message:'That code is not valid.'},401);
}
export async function onRequestGet({request,env}){
  if(await adminAuthorized(request,env))return json({ok:true,role:'admin'});
  const event=await staffEventFromRequest(request,env);
  if(event)return json({ok:true,role:'event',event});
  return json({ok:false,error:'unauthorized'},401);
}
export function onRequestDelete(){
  const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
  headers.append('set-cookie','f45_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  headers.append('set-cookie','f45_event_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(JSON.stringify({ok:true}),{status:200,headers});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

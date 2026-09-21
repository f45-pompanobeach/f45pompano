import {adminAuthorized,authThrottle,createNamedUserSession,deleteNamedUserSession,json,namedUserFromRequest,recordAuthFailure,recordAuthSuccess,resolveCodeIdentity,staffEventFromRequest} from './_shared.js';

export async function onRequestPost({request,env}){
  const throttle=await authThrottle(env,request);
  if(throttle.blocked)return json({ok:false,error:'rate_limited',message:`Too many failed attempts. Try again in about ${Math.ceil(throttle.retry_after/60)} minute${Math.ceil(throttle.retry_after/60)===1?'':'s'}.`,retry_after:throttle.retry_after},429);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const code=String(body.code||'').trim();
  if(!/^\d{4}$/.test(code)){await recordAuthFailure(env,request);return json({ok:false,error:'invalid_code',message:'Enter a 4-digit code.'},400)}
  const identity=await resolveCodeIdentity(env,code);
  if(identity.role==='admin'){
    await recordAuthSuccess(env,request);
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
    headers.append('set-cookie',`f45_admin_session=${identity.hash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    headers.append('set-cookie','f45_event_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    headers.append('set-cookie','f45_user_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(JSON.stringify({ok:true,role:'admin'}),{status:200,headers});
  }
  if(identity.role==='user'&&identity.user){
    const [session]=await Promise.all([
      createNamedUserSession(env,identity.user.user_key),
      recordAuthSuccess(env,request)
    ]);
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
    headers.append('set-cookie',`f45_user_session=${session.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    headers.append('set-cookie','f45_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    headers.append('set-cookie','f45_event_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(JSON.stringify({ok:true,role:'user',user:identity.user}),{status:200,headers});
  }
  if(identity.role==='event'&&identity.event){
    await recordAuthSuccess(env,request);
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
    headers.append('set-cookie',`f45_event_session=${identity.hash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    headers.append('set-cookie','f45_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    headers.append('set-cookie','f45_user_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(JSON.stringify({ok:true,role:'event',event:identity.event}),{status:200,headers});
  }
  const fail=await recordAuthFailure(env,request);
  if(Number(fail?.locked_until)>0)return json({ok:false,error:'rate_limited',message:'Too many failed attempts. Try again in about 15 minutes.',retry_after:900},429);
  return json({ok:false,error:'unauthorized',message:'That code is not valid.'},401);
}
export async function onRequestGet({request,env}){
  if(await adminAuthorized(request,env))return json({ok:true,role:'admin',user:{display_name:'Super Admin',permissions:['trial_intake','intake_admin','table_events','table_event_admin','partner_pages','leads','access_management']}});
  const user=await namedUserFromRequest(request,env);
  if(user)return json({ok:true,role:'user',user});
  const event=await staffEventFromRequest(request,env);
  if(event)return json({ok:true,role:'event',event});
  return json({ok:false,error:'unauthorized'},401);
}
export async function onRequestDelete({request,env}){
  await deleteNamedUserSession(request,env);
  const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});
  headers.append('set-cookie','f45_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  headers.append('set-cookie','f45_event_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  headers.append('set-cookie','f45_user_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(JSON.stringify({ok:true}),{status:200,headers});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

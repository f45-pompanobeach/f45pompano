import {adminAuthorized,json,listAdminUsers,saveAdminUser,cleanUserKey,USER_PERMISSIONS} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  return json({ok:true,users:await listAdminUsers(env),permissions:USER_PERMISSIONS});
}

export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const displayName=String(body.display_name||'').trim();
  const userKey=cleanUserKey(body.user_key||displayName);
  if(!displayName||!userKey)return json({ok:false,error:'invalid_user',message:'User name is required.'},400);
  try{
    await saveAdminUser(env,{
      userKey,
      displayName,
      pin:body.pin===undefined?null:String(body.pin||''),
      enabled:Boolean(body.enabled),
      permissions:Array.isArray(body.permissions)?body.permissions:[]
    });
  }catch(e){
    const code=String(e?.message||e);
    if(code==='invalid_pin')return json({ok:false,error:code,message:'PIN must be exactly 4 digits.'},400);
    if(code==='pin_in_use')return json({ok:false,error:code,message:'That PIN is already being used by another user or Table Event.'},409);
    return json({ok:false,error:'save_failed',message:'Could not save this user.'},500);
  }
  return json({ok:true,users:await listAdminUsers(env)});
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

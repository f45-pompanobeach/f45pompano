import {adminAuthorized,getGlobal,json,setGlobal} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  return json({ok:true,global:await getGlobal(env)});
}
export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const result=await setGlobal(env,body.global||body);
  return json({ok:true,global:result.value,updated_at:result.updated_at});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

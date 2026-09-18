import {adminAuthorized,deletePage,json,listPages,setPage} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  return json({ok:true,pages:await listPages(env)});
}
export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const action=String(body.action||'save');
  try{
    if(action==='delete'){await deletePage(env,body.slug);return json({ok:true});}
    const result=await setPage(env,body.page||body);
    return json({ok:true,page:result.value,updated_at:result.updated_at});
  }catch(e){
    const code=String(e?.message||e);
    return json({ok:false,error:code==='invalid_slug'||code==='invalid_root_slug'?code:'save_failed'},code.startsWith('invalid_')?400:500);
  }
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

import {getGlobal,getPage,json} from './_shared.js';

export async function onRequestGet({request,env}){
  const u=new URL(request.url);
  const slug=String(u.searchParams.get('slug')||'root').trim().toLowerCase();
  if(slug==='social-trial')return json({ok:true,locked:true,global:{},page:null});
  try{
    const [global,page]=await Promise.all([getGlobal(env),getPage(env,slug)]);
    return json({ok:true,global,page});
  }catch{return json({ok:false,error:'config_unavailable'},503)}
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

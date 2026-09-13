import {adminAuthorized,eventForStaffCode,json} from './_shared.js';

export async function onRequestPost({request,env}){
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const code=String(body.code||'').trim();
  if(!/^\d{4}$/.test(code))return json({ok:false,error:'invalid_code',message:'Enter a 4-digit code.'},400);
  const synthetic=new Request(request.url,{headers:{'x-table-code':code}});
  if(await adminAuthorized(synthetic,env))return json({ok:true,role:'admin'});
  const event=await eventForStaffCode(env,code);
  if(event)return json({ok:true,role:'event',event});
  return json({ok:false,error:'unauthorized',message:'That code is not valid.'},401);
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

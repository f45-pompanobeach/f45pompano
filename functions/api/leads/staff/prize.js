import {json,staffEventFromRequest} from '../_shared.js';
import {savePrizeForEvent} from '../_prize.js';
export async function onRequestPost({request,env}){
  const event=await staffEventFromRequest(request,env);
  if(!event)return json({ok:false,error:'unauthorized'},401);
  let data={};try{data=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const id=String(data.id||'').trim();
  if(!id)return json({ok:false,error:'missing_id'},400);
  const saved=await savePrizeForEvent(env,event,id,data.prize,{custom:data.custom===true});
  return saved.response;
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

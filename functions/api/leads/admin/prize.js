import {adminAuthorized,ensureSchema,eventDb,json} from '../_shared.js';
import {savePrizeForEvent} from '../_prize.js';

export async function onRequestPost(context){
  const {request,env}=context;
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let data;
  try{data=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const leadId=String(data.id||'').trim();
  const eventKey=String(data.event_key||'').trim();
  if(!leadId||!eventKey)return json({ok:false,error:'missing_fields'},400);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  const db=eventDb(env);
  const event=await db.prepare('SELECT event_key,name,prize_enabled,prizes_json FROM lead_events WHERE event_key=? LIMIT 1').bind(eventKey).first();
  if(!event)return json({ok:false,error:'event_not_found'},404);
  const result=await savePrizeForEvent(env,event,leadId,data.prize,{custom:data.custom===true});
  return result.response;
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

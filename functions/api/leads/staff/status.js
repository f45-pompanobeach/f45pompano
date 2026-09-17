import {ensureSchema,eventDb,json,staffEventFromRequest,updateLeadFollowupStatus} from '../_shared.js';

export async function onRequestPost({request,env}){
  const event=await staffEventFromRequest(request,env);
  if(!event)return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const id=String(body.id||'').trim(),status=String(body.status||'').trim();
  if(!id)return json({ok:false,error:'missing_id'},400);
  const lead=await eventDb(env).prepare('SELECT id FROM event_leads WHERE id=? AND event_key=? LIMIT 1').bind(id,event.event_key).first();
  if(!lead)return json({ok:false,error:'not_found'},404);
  try{await updateLeadFollowupStatus(env,{id,eventKey:event.event_key,status})}catch{return json({ok:false,error:'invalid_status',message:'Choose a valid follow-up status.'},400)}
  return json({ok:true,id,status});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

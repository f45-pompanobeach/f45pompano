import {EVENT_KEY,ensureSchema,eventDb,hasDb,json,staffAuthorized} from '../_shared.js';

export async function onRequestPost(context){
  const {request,env}=context;
  if(!await staffAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!hasDb(env))return json({ok:false,error:'d1_not_configured',message:'Shared event lead storage is not configured yet.'},503);
  let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const id=String(body.id||'').trim();
  if(!id)return json({ok:false,error:'invalid_request'},400);
  try{
    await ensureSchema(env);
    const db=eventDb(env);
    const existing=await db.prepare(`SELECT id FROM event_leads WHERE id=? AND event_key=? LIMIT 1`).bind(id,EVENT_KEY).first();
    if(!existing)return json({ok:false,error:'lead_not_found'},404);
    await db.prepare(`DELETE FROM event_leads WHERE id=? AND event_key=?`).bind(id,EVENT_KEY).run();
    return json({ok:true,deleted:true,lead_id:id});
  }catch{return json({ok:false,error:'delete_failed',message:'Could not delete this lead.'},500)}
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

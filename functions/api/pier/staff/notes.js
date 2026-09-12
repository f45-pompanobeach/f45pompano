import {EVENT_KEY,ensureSchema,eventDb,hasDb,json,staffAuthorized} from '../_shared.js';

export async function onRequestPost({request,env}){
  if(!await staffAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!hasDb(env))return json({ok:false,error:'d1_not_configured',message:'Shared event lead storage is not configured yet.'},503);
  let body={};
  try{body=await request.json()}catch{return json({ok:false,error:'invalid_json',message:'Invalid request.'},400)}
  const id=String(body.id||'').trim();
  const notes=String(body.notes??'').trim();
  if(!id)return json({ok:false,error:'missing_id',message:'Lead ID is required.'},400);
  if(notes.length>1000)return json({ok:false,error:'notes_too_long',message:'Notes must be 1,000 characters or less.'},400);
  try{
    await ensureSchema(env);
    const db=eventDb(env),now=new Date().toISOString();
    const existing=await db.prepare('SELECT id FROM event_leads WHERE event_key=? AND id=? LIMIT 1').bind(EVENT_KEY,id).first();
    if(!existing)return json({ok:false,error:'not_found',message:'Lead not found.'},404);
    await db.prepare('UPDATE event_leads SET notes=?,updated_at=? WHERE event_key=? AND id=?').bind(notes||null,now,EVENT_KEY,id).run();
    return json({ok:true,id,notes:notes||''});
  }catch(e){return json({ok:false,error:'d1_update_failed',message:'Could not save notes.'},500)}
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

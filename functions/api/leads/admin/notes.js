import {adminAuthorized,ensureSchema,eventDb,json} from '../_shared.js';
export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const id=String(body.id||'').trim(),notes=String(body.notes??'').trim();
  if(!id)return json({ok:false,error:'missing_id'},400);
  if(notes.length>1000)return json({ok:false,error:'notes_too_long',message:'Notes must be 1,000 characters or less.'},400);
  const db=eventDb(env),now=new Date().toISOString();
  const lead=await db.prepare('SELECT id FROM event_leads WHERE id=? LIMIT 1').bind(id).first();
  if(!lead)return json({ok:false,error:'not_found'},404);
  await db.prepare('UPDATE event_leads SET notes=?,updated_at=? WHERE id=?').bind(notes||null,now,id).run();
  return json({ok:true,id,notes:notes||''});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

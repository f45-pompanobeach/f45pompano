import {adminAuthorized,ensureSchema,eventDb,json} from '../_shared.js';

export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  let d={};try{d=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const id=String(d.id||'').trim(),tracked=d.tracked===true;
  if(!id)return json({ok:false,error:'missing_id'},400);
  const now=new Date().toISOString();
  const r=await eventDb(env).prepare('UPDATE event_leads SET tracked_elsewhere=?,tracked_elsewhere_at=?,updated_at=? WHERE id=?').bind(tracked?1:0,tracked?now:null,now,id).run();
  if(!Number(r?.meta?.changes||0))return json({ok:false,error:'not_found'},404);
  return json({ok:true,id,tracked_elsewhere:tracked,tracked_elsewhere_at:tracked?now:null});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

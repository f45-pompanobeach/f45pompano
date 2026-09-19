import {adminAuthorized,ensureSchema,eventDb,json} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  const q=await eventDb(env).prepare("SELECT id,event_key,event_name,event_type,lead_source,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,confirmed_at,prize,notes,COALESCE(followup_status,'new') AS followup_status,COALESCE(tracked_elsewhere,0) AS tracked_elsewhere,tracked_elsewhere_at FROM event_leads ORDER BY created_at DESC LIMIT 2500").all();
  return json({ok:true,leads:q.results||[]});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

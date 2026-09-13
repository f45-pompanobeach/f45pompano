import {ensureSchema,eventDb,json,staffEventFromRequest} from '../_shared.js';

export async function onRequestGet({request,env}){
  const event=await staffEventFromRequest(request,env);
  if(!event)return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  const db=eventDb(env);
  const q=await db.prepare(`SELECT id,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,confirmed_at,prize,prize_text_status,notes FROM event_leads WHERE event_key=? ORDER BY created_at DESC LIMIT 1000`).bind(event.event_key).all();
  return json({ok:true,event,leads:q.results||[]});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

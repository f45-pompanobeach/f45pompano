import {EVENT_KEY,dedupeEventLeads,ensureSchema,eventDb,hasDb,json,staffAuthorized} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await staffAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!hasDb(env))return json({ok:false,error:'d1_not_configured',message:'Shared event lead storage is not configured yet.'},503);
  try{
    await ensureSchema(env);
    const cleanup=await dedupeEventLeads(env);
    const db=eventDb(env);
    const q=await db.prepare(`SELECT id,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,confirmation_code,confirmed_at,sms_delivery_status,sms_error_code,prize,prize_saved_at,prize_text_status,prize_text_message_id,prize_text_error_code,notes FROM event_leads WHERE event_key=? ORDER BY created_at DESC LIMIT 500`).bind(EVENT_KEY).all();
    return json({ok:true,event_key:EVENT_KEY,server_time:new Date().toISOString(),cleanup,leads:q.results||[]});
  }catch(e){return json({ok:false,error:'d1_query_failed',message:'Could not load the live lead list.'},500)}
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

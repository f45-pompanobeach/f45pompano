import {adminAuthorized,ensureSchema,eventDb,json} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  const u=new URL(request.url),eventKey=String(u.searchParams.get('event_key')||'').trim();
  const db=eventDb(env);
  let event={event_key:'general',name:'General Leads',slug:null,event_date:null,start_time:null,end_time:null,qr_kit:null,archived:0,prize_enabled:0,prizes_json:'[]',confirmation_enabled:0};
  if(eventKey&&eventKey!=='general'){
    event=await db.prepare('SELECT event_key,name,slug,event_date,start_time,end_time,qr_kit,archived,prize_enabled,prizes_json,confirmation_enabled FROM lead_events WHERE event_key=? LIMIT 1').bind(eventKey).first();
    if(!event)return json({ok:false,error:'event_not_found'},404);
  }
  const key=eventKey||'general';
  const q=await db.prepare(`SELECT id,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,confirmed_at,prize,prize_text_status,notes,COALESCE(followup_status,'new') AS followup_status,followup_updated_at FROM event_leads WHERE event_key=? ORDER BY created_at DESC LIMIT 1000`).bind(key).all();
  return json({ok:true,event,leads:q.results||[]});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

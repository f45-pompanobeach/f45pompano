import {adminAuthorized,namedUserFromRequest,eventDb,json} from '../../../leads/_shared.js';
import {ensureActivitySchema} from '../../_activity.js';
import {ensureDiagnosticSchema} from '../../_diagnostics.js';
export async function onRequestGet({request,env}){
 const isAdmin=await adminAuthorized(request,env);
 const staff=isAdmin?null:await namedUserFromRequest(request,env);
 if(!isAdmin&&!staff?.permissions?.includes('page_tracking'))
  return json({ok:false,error:'unauthorized'},401);
 const id=new URL(request.url).searchParams.get('id')||'';
 if(!/^[a-f0-9-]{36}$/i.test(id))return json({ok:false,error:'invalid_visit'},400);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 try{
  await ensureActivitySchema(db);
  await ensureDiagnosticSchema(db);
  const expiry=new Date(Date.now()-30*86400000).toISOString();
  await db.prepare('UPDATE landing_page_activity SET field_value=NULL WHERE field_value IS NOT NULL AND created_at<?').bind(expiry).run();
  const visit=await db.prepare('SELECT id,visited_at,page,session_id,visitor_id FROM landing_page_visits WHERE id=? LIMIT 1').bind(id).first();
  if(!visit)return json({ok:false,error:'visit_not_found'},404);
  const result=await db.prepare('SELECT id,created_at,event_name,target,field_name,field_value,detail,consented FROM landing_page_activity WHERE visit_id=? ORDER BY created_at ASC,rowid ASC LIMIT 250').bind(id).all();
  const events=(result.results||[]).map(e=>({
   ...e,field_value:isAdmin?e.field_value:null,consented:e.consented===1
  }));
  let visits=[];
  if(visit.visitor_id){
   const rows=await db.prepare('SELECT id,visited_at,page FROM landing_page_visits WHERE visitor_id=? ORDER BY visited_at DESC LIMIT 25').bind(visit.visitor_id).all();
   visits=rows.results||[];
  }
  const diagnostics=await db.prepare('SELECT browser,operating_system,device_type,navigation_type,entry_path,query_keys,first_touch_source,first_touch_medium,first_touch_campaign,click_id_type,network_hash,network_asn,network_org,country,bot_signal,traffic_review,review_reasons,screen_bucket,captured_at FROM page_tracking_diagnostics WHERE visit_id=?')
   .bind(id).first();
  // Network hashes help correlate anonymous visits for a short time.
  // Never expose them to non-admin staff or the public.
  const safeDiagnostics=diagnostics?{...diagnostics,network_hash:isAdmin?diagnostics.network_hash:null}:null;
  // A browser's other landing pages form a journey, not proof of identity.
  return json({ok:true,visit,events,return_visits:visits,diagnostics:safeDiagnostics,can_view_saved_contact:isAdmin});
 }catch(e){console.error('Activity detail error',e?.message||e);return json({ok:false,error:'history_unavailable'},503)}
}
export function onRequest(){return json({ok:false},405)}

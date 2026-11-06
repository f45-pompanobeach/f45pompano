import {adminAuthorized,namedUserFromRequest,eventDb,json} from '../../leads/_shared.js';
import {ensureActivitySchema} from '../_activity.js';
const fields=['mindbody_clicked_at','utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id','referrer'];
export async function onRequestGet({request,env}){
 const user=await namedUserFromRequest(request,env);
 if(!await adminAuthorized(request,env)&&!user?.permissions?.includes('page_tracking'))return json({ok:false,error:'unauthorized'},401);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 try{
  await ensureActivitySchema(db);
  const cols=await db.prepare('PRAGMA table_info(landing_page_visits)').all();
  for(const field of fields)if(!(cols.results||[]).some(c=>c.name===field))await db.prepare('ALTER TABLE landing_page_visits ADD COLUMN '+field+' TEXT').run().catch(e=>{if(!String(e).includes('duplicate column'))throw e});
  const [newRows,legacyRows]=await Promise.all([
   db.prepare('SELECT id,visited_at,page,session_id,visitor_id,'+fields.join(',')+`, (SELECT COUNT(*) FROM landing_page_activity a WHERE a.visit_id=landing_page_visits.id) AS activity_count, (SELECT COUNT(*) FROM landing_page_activity a WHERE a.visit_id=landing_page_visits.id AND a.event_name IN ('field_edited','trial_cta_clicked','checkout_clicked','checkout_blocked','button_clicked','form_submit_attempt','form_submitted')) AS engagement_count, (SELECT COUNT(*) FROM landing_page_activity a WHERE a.visit_id=landing_page_visits.id AND a.event_name='checkout_blocked') AS blocked_checkout_count, (SELECT event_name FROM landing_page_activity a WHERE a.visit_id=landing_page_visits.id ORDER BY created_at DESC, rowid DESC LIMIT 1) AS last_activity FROM landing_page_visits ORDER BY visited_at DESC LIMIT 1500`).all(),
   db.prepare('SELECT id,visited_at,page,session_id FROM meta_landing_visits ORDER BY visited_at DESC LIMIT 300').all().catch(()=>({results:[]}))
  ]);
  const visits=[...(newRows.results||[]).map(row=>({...row,visit_source:'landing'})),...(legacyRows.results||[]).map(row=>({...row,visit_source:'meta'}))].sort((a,b)=>b.visited_at.localeCompare(a.visited_at)).slice(0,1500);
  return json({ok:true,visits,can_delete:await adminAuthorized(request,env)});
 }catch{return json({ok:false,error:'history_unavailable'},503)}
}
// Delete one exact visit only. Named staff with page_tracking access cannot delete.
export async function onRequestDelete({request,env}){
 if(!await adminAuthorized(request,env))return json({ok:false,error:'super_admin_required'},403);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 let input;try{input=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
 const id=String(input?.id||'').trim(),source=input?.visit_source;
 if(!/^[a-f0-9-]{36}$/i.test(id)||!['landing','meta'].includes(source))
   return json({ok:false,error:'invalid_visit'},400);
 const table=source==='meta'?'meta_landing_visits':'landing_page_visits';
 try{
  if(source==='landing')await db.prepare('DELETE FROM landing_page_activity WHERE visit_id=?').bind(id).run();
  const result=await db.prepare('DELETE FROM '+table+' WHERE id=?').bind(id).run();
  const deleted=Number(result?.meta?.changes||0);
  return deleted===1?json({ok:true,deleted:1}):json({ok:false,error:'visit_not_found'},404);
 }catch{return json({ok:false,error:'delete_failed'},503)}
}
// Bulk deletion is deliberately Super Admin-only, bounded and keyed by exact rows.
export async function onRequestPatch({request,env}){
 if(!await adminAuthorized(request,env))return json({ok:false,error:'super_admin_required'},403);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
 const selected=body?.selected;
 if(!Array.isArray(selected)||!selected.length||selected.length>100)return json({ok:false,error:'invalid_selection'},400);
 const ids=new Set();
 for(const row of selected){
  const id=String(row?.id||''),source=row?.visit_source;
  if(!/^[a-f0-9-]{36}$/i.test(id)||!['landing','meta'].includes(source)||ids.has(source+':'+id))
   return json({ok:false,error:'invalid_selection'},400);
  ids.add(source+':'+id);
 }
 try{
  // Apply the selected deletes together; do not touch nonselected visit rows.
  const queries=[];
  for(const {id,visit_source:source} of selected){
   if(source==='landing')queries.push(db.prepare('DELETE FROM landing_page_activity WHERE visit_id=?').bind(id));
   queries.push(db.prepare('DELETE FROM '+(source==='meta'?'meta_landing_visits':'landing_page_visits')+' WHERE id=?').bind(id));
  }
  const results=await db.batch(queries);
  // Count only the visit deletion statements (not related activity events).
  let n=0,k=0;
  for(const row of selected){if(row.visit_source==='landing')k++;n+=Number(results[k]?.meta?.changes||0);k++}
  return json({ok:true,deleted:n,requested:selected.length});
 }catch{return json({ok:false,error:'bulk_delete_failed'},503)}
}
export function onRequest(){return json({ok:false},405)}

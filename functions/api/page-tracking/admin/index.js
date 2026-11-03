import {adminAuthorized,namedUserFromRequest,eventDb,json} from '../../leads/_shared.js';
const fields=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id','referrer'];
export async function onRequestGet({request,env}){
 const user=await namedUserFromRequest(request,env);
 if(!await adminAuthorized(request,env)&&!user?.permissions?.includes('page_tracking'))return json({ok:false,error:'unauthorized'},401);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS landing_page_visits (id TEXT PRIMARY KEY,visited_at TEXT NOT NULL,page TEXT NOT NULL,session_id TEXT NOT NULL)').run();
  const cols=await db.prepare('PRAGMA table_info(landing_page_visits)').all();
  for(const field of fields)if(!(cols.results||[]).some(c=>c.name===field))await db.prepare('ALTER TABLE landing_page_visits ADD COLUMN '+field+' TEXT').run().catch(e=>{if(!String(e).includes('duplicate column'))throw e});
  const [newRows,legacyRows]=await Promise.all([
   db.prepare('SELECT id,visited_at,page,session_id,'+fields.join(',')+' FROM landing_page_visits ORDER BY visited_at DESC LIMIT 1500').all(),
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
  const result=await db.prepare('DELETE FROM '+table+' WHERE id=?').bind(id).run();
  const deleted=Number(result?.meta?.changes||0);
  return deleted===1?json({ok:true,deleted:1}):json({ok:false,error:'visit_not_found'},404);
 }catch{return json({ok:false,error:'delete_failed'},503)}
}
export function onRequest(){return json({ok:false},405)}

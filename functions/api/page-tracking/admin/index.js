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
   db.prepare('SELECT visited_at,page,session_id,'+fields.join(',')+' FROM landing_page_visits ORDER BY visited_at DESC LIMIT 1500').all(),
   db.prepare('SELECT visited_at,page,session_id FROM meta_landing_visits ORDER BY visited_at DESC LIMIT 300').all().catch(()=>({results:[]}))
  ]);
  const visits=[...(newRows.results||[]),...(legacyRows.results||[])].sort((a,b)=>b.visited_at.localeCompare(a.visited_at)).slice(0,1500);
  return json({ok:true,visits});
 }catch{return json({ok:false,error:'history_unavailable'},503)}
}
export function onRequest(){return json({ok:false},405)}

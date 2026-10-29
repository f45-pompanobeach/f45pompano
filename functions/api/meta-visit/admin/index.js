import {adminAuthorized,eventDb,json} from '../../leads/_shared.js';
export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
  try{
    await db.prepare('CREATE TABLE IF NOT EXISTS meta_landing_visits (id TEXT PRIMARY KEY, visited_at TEXT NOT NULL, page TEXT NOT NULL, session_id TEXT NOT NULL)').run();
    const rows=await db.prepare('SELECT visited_at,session_id FROM meta_landing_visits WHERE page=? ORDER BY visited_at DESC LIMIT 300').bind('social-trial').all();
    const counts=await db.prepare('SELECT COUNT(*) AS visits,COUNT(DISTINCT session_id) AS sessions FROM meta_landing_visits WHERE page=?').bind('social-trial').first();
    return json({ok:true,visits:rows.results||[],total:Number(counts?.visits||0),sessions:Number(counts?.sessions||0)});
  }catch{return json({ok:false,error:'visit_history_unavailable'},503)}
}
export function onRequest(){return json({ok:false},405)}

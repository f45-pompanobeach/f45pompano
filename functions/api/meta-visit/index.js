import {eventDb,json} from '../leads/_shared.js';
export async function onRequestPost({request,env}){
  const origin=request.headers.get('origin');
  if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
  const length=Number(request.headers.get('content-length')||0);
  if(length>1024)return json({ok:false},413);
  let body;try{body=await request.json()}catch{return json({ok:false},400)}
  if(body?.page!=='social-trial'||!/^[-a-zA-Z0-9_]{16,80}$/.test(String(body?.session||'')))return json({ok:false},400);
  const db=eventDb(env);if(!db)return json({ok:false},503);
  try{
    await db.prepare('CREATE TABLE IF NOT EXISTS meta_landing_visits (id TEXT PRIMARY KEY, visited_at TEXT NOT NULL, page TEXT NOT NULL, session_id TEXT NOT NULL)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_meta_landing_visits_time ON meta_landing_visits(visited_at DESC)').run();
    await db.prepare('INSERT INTO meta_landing_visits (id,visited_at,page,session_id) VALUES (?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),'social-trial',body.session).run();
    return json({ok:true});
  }catch{return json({ok:false},503)}
}
export function onRequest(){return json({ok:false},405)}

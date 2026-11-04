import {eventDb,json} from '../../leads/_shared.js';
import {getPage} from '../../landing/_shared.js';
import {ensureActivitySchema,validIdentity,sanitizeEvent} from '../_activity.js';
export async function onRequestPost({request,env}){
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
 if(Number(request.headers.get('content-length')||0)>20000)return json({ok:false},413);
 let d;try{d=await request.json()}catch{return json({ok:false},400)}
 const page=String(d?.page||''),session=String(d?.session||''),visitor=String(d?.visitor||'');
 if(!validIdentity(page,session,visitor))return json({ok:false},400);
 const events=(Array.isArray(d.events)?d.events:[d.event]).map(sanitizeEvent);
 if(events.length<1||events.length>12||events.some(x=>!x))return json({ok:false},400);
 try{const cfg=await getPage(env,page);if(cfg?.trackingMode==='off')return json({ok:true,tracked:false})}
 catch{return json({ok:false,error:'config_unavailable'},503)}
 const db=eventDb(env);if(!db)return json({ok:false},503);
 try{
  await ensureActivitySchema(db);
  const now=new Date().toISOString(),cutoff=new Date(Date.now()-30*60000).toISOString();
  let row=await db.prepare('SELECT id FROM landing_page_visits WHERE page=? AND session_id=? AND visited_at>=? ORDER BY visited_at DESC LIMIT 1').bind(page,session,cutoff).first();
  if(!row)return json({ok:true,tracked:false});
  if(visitor)await db.prepare('UPDATE landing_page_visits SET visitor_id=COALESCE(visitor_id,?) WHERE id=?').bind(visitor,row.id).run();
  const total=await db.prepare('SELECT COUNT(*) AS n FROM landing_page_activity WHERE visit_id=?').bind(row.id).first();
  const available=Math.max(0,200-Number(total?.n||0));
  const last=await db.prepare("SELECT event_name FROM landing_page_activity WHERE visit_id=? AND event_name IN ('progress_opt_in','progress_opt_out') ORDER BY created_at DESC, rowid DESC LIMIT 1").bind(row.id).first();
  let consent=last?.event_name==='progress_opt_in',clearSaved=false;
  const allowed=events.slice(0,available);
  for(const e of allowed){
   if(e.event_name==='progress_opt_in')consent=true;
   if(e.event_name==='progress_opt_out'){consent=false;clearSaved=true}
   if(!consent)e.field_value=null;
  }
  if(clearSaved)await db.prepare('UPDATE landing_page_activity SET field_value=NULL,consented=0 WHERE visit_id=?').bind(row.id).run();
  if(allowed.length)await db.batch(allowed.map(e=>db.prepare(
   'INSERT OR IGNORE INTO landing_page_activity(id,visit_id,page,session_id,visitor_id,created_at,event_name,target,field_name,field_value,consented,detail) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(e.id,row.id,page,session,visitor||null,now,e.event_name,e.target,e.field_name,e.field_value,consent?e.consented:0,e.detail)));
  // Minimize retention of abandoned contact data; retain anonymous aggregate activity.
  await db.prepare("UPDATE landing_page_activity SET field_value=NULL WHERE field_value IS NOT NULL AND created_at<?").bind(new Date(Date.now()-30*86400000).toISOString()).run();
  return json({ok:true,tracked:allowed.length>0,accepted:allowed.length,visit_id:row.id});
 }catch(e){console.error('Landing activity save failed',e?.message||e);return json({ok:false,error:'storage_unavailable'},503)}
}
export function onRequest(){return json({ok:false},405)}

import {eventDb,json} from '../../leads/_shared.js';
import {ensureActivitySchema,validIdentity,sanitizeEvent} from '../_activity.js';
export async function onRequestPost({request,env}){
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
 let d;try{d=await request.json()}catch{return json({ok:false},400)}
 const page=String(d?.page||''),session=String(d?.session||''),visitor=String(d?.visitor||'');
 if(!validIdentity(page,session,visitor))return json({ok:false},400);
 const events=(Array.isArray(d.events)?d.events:[d.event]).map(sanitizeEvent);
 if(events.length<1||events.length>12||events.some(x=>!x))return json({ok:false},400);
 const db=eventDb(env);if(!db)return json({ok:false},503);
 try{
  await ensureActivitySchema(db);
  const now=new Date().toISOString();
  const cutoff=new Date(Date.now()-1800000).toISOString();
  const row=await db.prepare('SELECT id FROM landing_page_visits WHERE page=? AND session_id=? AND visited_at>=? ORDER BY visited_at DESC LIMIT 1').bind(page,session,cutoff).first();
  if(!row)return json({ok:true,tracked:false});
  await db.batch(events.map(e=>db.prepare('INSERT OR IGNORE INTO landing_page_activity(id,visit_id,page,session_id,visitor_id,created_at,event_name,target,field_name,field_value,consented,detail) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(e.id,row.id,page,session,visitor||null,now,e.event_name,e.target,e.field_name,e.field_value,e.consented,e.detail)));
  return json({ok:true,tracked:true});
 }catch{return json({ok:false},503)}
}
export function onRequest(){return json({ok:false},405)}

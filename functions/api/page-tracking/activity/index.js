import {eventDb,json} from '../../leads/_shared.js';
import {getPage} from '../../landing/_shared.js';
import {ensureActivitySchema,validIdentity,sanitizeEvent} from '../_activity.js';
import {notifyNewTrackingVisit} from '../_notifications.js';
import {notifyReturningActivity} from '../_return_alerts.js';
export async function onRequestPost(context){
 const {request,env}=context;
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
 if(Number(request.headers.get('content-length')||0)>20000)return json({ok:false},413);
 let d;try{d=await request.json()}catch{return json({ok:false},400)}
 const page=String(d?.page||''),session=String(d?.session||''),visitor=String(d?.visitor||'');
 if(!validIdentity(page,session,visitor))return json({ok:false},400);
 const events=(Array.isArray(d.events)?d.events:[d.event]).map(sanitizeEvent);
 if(events.length<1||events.length>12||events.some(x=>!x))return json({ok:false},400);
 let mode='all';
 try{const cfg=await getPage(env,page);mode=cfg?.trackingMode||'all';if(mode==='off')return json({ok:true,tracked:false})}
 catch{return json({ok:false,error:'config_unavailable'},503)}
 const db=eventDb(env);if(!db)return json({ok:false},503);
 try{
  await ensureActivitySchema(db);
  // Reattach activity to the original per-tab, per-page visit after Safari restores it.
  const now=new Date().toISOString();
  let row=await db.prepare('SELECT id FROM landing_page_visits WHERE page=? AND session_id=? ORDER BY visited_at DESC LIMIT 1').bind(page,session).first();
  if(!row){
   // An interaction may reach the server before the initial visit POST.
   // Do not create unattributed visits when the page is configured as UTM-only.
   if(mode==='utm')return json({ok:true,tracked:false});
   if(page==='root'&&d?.foreground!==true){
    const recentPartner=await db.prepare("SELECT id FROM landing_page_visits WHERE page<>'root' AND visitor_id=? AND visited_at>=? ORDER BY visited_at DESC LIMIT 1")
     .bind(visitor,new Date(Date.now()-5000).toISOString()).first();
    if(recentPartner)return json({ok:true,tracked:false});
   }

   const id=crypto.randomUUID();
   await db.prepare('INSERT INTO landing_page_visits(id,visited_at,page,session_id,visitor_id) VALUES(?,?,?,?,?)').bind(id,now,page,session,visitor||null).run();
   row={id};
   await notifyNewTrackingVisit(context,db,{id,page,visited_at:now});
  }
  if(visitor)await db.prepare('UPDATE landing_page_visits SET visitor_id=COALESCE(visitor_id,?) WHERE id=?').bind(visitor,row.id).run();
  const total=await db.prepare('SELECT COUNT(*) AS n FROM landing_page_activity WHERE visit_id=?').bind(row.id).first();
  const available=Math.max(0,200-Number(total?.n||0));
  const allowed=events.slice(0,available);
  // Keep legacy opt-out requests supported for cached older browser clients.
  // The currently published pages no longer display that option.
  if(allowed.some(e=>e.event_name==='progress_opt_out')){
   for(const e of allowed){e.field_value=null;e.consented=0}
   await db.prepare('UPDATE landing_page_activity SET field_value=NULL,consented=0 WHERE visit_id=?').bind(row.id).run();
  }
  // Reopening Safari can replay an old field value (including an exit snapshot).
  // Compare against the latest saved value on THIS tracking row, not only the
  // browser's in-memory state, which disappears after a reload.
  const latestFields=new Map(), changed=[];
  for(const e of allowed){
   if(e.event_name==='field_edited'&&e.field_value!==null){
    if(!latestFields.has(e.field_name)){
     const previous=await db.prepare('SELECT field_value FROM landing_page_activity WHERE visit_id=? AND field_name=? AND field_value IS NOT NULL ORDER BY created_at DESC,rowid DESC LIMIT 1')
      .bind(row.id,e.field_name).first();
     latestFields.set(e.field_name,previous?.field_value??null);
    }
    if(latestFields.get(e.field_name)===e.field_value)continue;
    latestFields.set(e.field_name,e.field_value);
   }
   changed.push(e);
  }
  if(changed.length){
   const saved=await db.batch(changed.map(e=>db.prepare(
    'INSERT OR IGNORE INTO landing_page_activity(id,visit_id,page,session_id,visitor_id,created_at,event_name,target,field_name,field_value,consented,detail) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
   ).bind(e.id,row.id,page,session,visitor||null,e.at,e.event_name,e.target,e.field_name,e.field_value,e.consented,e.detail)));
   const fresh=changed.filter((e,i)=>Number(saved[i]?.meta?.changes||0)>0);
   if(fresh.length)await notifyReturningActivity(context,db,{visitId:row.id,page,events:fresh});
  }
  // Minimize retention of abandoned contact data; retain anonymous aggregate activity.
  await db.prepare("UPDATE landing_page_activity SET field_value=NULL WHERE field_value IS NOT NULL AND created_at<?").bind(new Date(Date.now()-30*86400000).toISOString()).run();
  return json({ok:true,tracked:changed.length>0,accepted:changed.length,visit_id:row.id});
 }catch(e){console.error('Landing activity save failed',e?.message||e);return json({ok:false,error:'storage_unavailable'},503)}
}
export function onRequest(){return json({ok:false},405)}

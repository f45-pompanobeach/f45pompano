import {adminAuthorized,eventDb,json} from '../../../leads/_shared.js';
const DEFAULT_TO='f45pbllc@gmail.com';
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=200;
export async function trackingNotificationConfig(db){
 await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_alert_settings (id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 1,recipient TEXT NOT NULL DEFAULT 'f45pbllc@gmail.com',updated_at TEXT)").run();
 const row=await db.prepare('SELECT enabled,recipient FROM page_tracking_alert_settings WHERE id=1').first();
 return {enabled:row?row.enabled===1:true,recipient:row?.recipient||DEFAULT_TO};
}
export async function onRequestGet({request,env}){
 if(!await adminAuthorized(request,env))return json({ok:false,error:'super_admin_required'},403);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 try{return json({ok:true,...await trackingNotificationConfig(db)})}catch{return json({ok:false,error:'settings_unavailable'},503)}
}
export async function onRequestPost({request,env}){
 if(!await adminAuthorized(request,env))return json({ok:false,error:'super_admin_required'},403);
 const db=eventDb(env);if(!db)return json({ok:false,error:'db_unavailable'},503);
 let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
 const recipient=String(body?.recipient||'').trim().toLowerCase();
 if(typeof body?.enabled!=='boolean'||!validEmail(recipient))return json({ok:false,error:'invalid_settings'},400);
 try{
  await trackingNotificationConfig(db);
  await db.prepare('INSERT INTO page_tracking_alert_settings(id,enabled,recipient,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,recipient=excluded.recipient,updated_at=excluded.updated_at').bind(body.enabled?1:0,recipient,new Date().toISOString()).run();
  return json({ok:true,enabled:body.enabled,recipient});
 }catch{return json({ok:false,error:'settings_save_failed'},503)}
}
export function onRequest(){return json({ok:false},405)}

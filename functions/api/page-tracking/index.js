import {eventDb,json} from '../leads/_shared.js';
export async function onRequestPost({request,env}){
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
 if(Number(request.headers.get('content-length')||0)>1024)return json({ok:false},413);
 let d;try{d=await request.json()}catch{return json({ok:false},400)}
 const page=String(d?.page||'').toLowerCase(),session=String(d?.session||'');
 if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(page)||! /^[a-f0-9]{32}$/.test(session))return json({ok:false},400);
 const db=eventDb(env);if(!db)return json({ok:false},503);
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS landing_page_visits (id TEXT PRIMARY KEY,visited_at TEXT NOT NULL,page TEXT NOT NULL,session_id TEXT NOT NULL)').run();
  await db.prepare('INSERT INTO landing_page_visits(id,visited_at,page,session_id) VALUES(?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),page,session).run();
  return json({ok:true});
 }catch{return json({ok:false},503)}
}
export function onRequest(){return json({ok:false},405)}

import {eventDb,json} from '../leads/_shared.js';
import {getPage} from '../landing/_shared.js';
const fields=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id','referrer'];
function clean(v,max=160){return String(v||'').trim().slice(0,max).replace(/[\u0000-\u001f]/g,'')}
async function schema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS landing_page_visits (id TEXT PRIMARY KEY,visited_at TEXT NOT NULL,page TEXT NOT NULL,session_id TEXT NOT NULL)').run();
 const cols=await db.prepare('PRAGMA table_info(landing_page_visits)').all();
 for(const field of [...fields,'visitor_id'])if(!(cols.results||[]).some(c=>c.name===field))await db.prepare('ALTER TABLE landing_page_visits ADD COLUMN '+field+' TEXT').run().catch(e=>{if(!String(e).includes('duplicate column'))throw e});
}
export async function onRequestPost({request,env}){
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
 if(Number(request.headers.get('content-length')||0)>4096)return json({ok:false},413);
 let d;try{d=await request.json()}catch{return json({ok:false},400)}
 const page=String(d?.page||'').toLowerCase(),session=String(d?.session||'');
 const visitor=/^[a-f0-9]{32}$/.test(String(d?.visitor||''))?String(d.visitor):null;
 if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(page)||!/^[a-f0-9]{32}$/.test(session))return json({ok:false},400);
 try{const config=await getPage(env,page);const mode=config?.trackingMode||'all';if(mode==='off')return json({ok:true,tracked:false});if(mode==='utm'&&!['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id'].some(k=>String(d?.[k]||'').trim()))return json({ok:true,tracked:false});}catch{return json({ok:false,error:'config_unavailable'},503)}
 const db=eventDb(env);if(!db)return json({ok:false},503);
 try{
  await schema(db);
  const vals=fields.map(f=>clean(d?.[f],f==='referrer'?400:160));
  const now=new Date();const cutoff=new Date(now.getTime()-30*60*1000).toISOString();
  const result=await db.prepare('INSERT INTO landing_page_visits(id,visited_at,page,session_id,visitor_id,'+fields.join(',')+') SELECT '+Array(5+fields.length).fill('?').join(',')+' WHERE NOT EXISTS (SELECT 1 FROM landing_page_visits WHERE page=? AND session_id=? AND visited_at>=?)').bind(crypto.randomUUID(),now.toISOString(),page,session,visitor,...vals,page,session,cutoff).run();
  // The activity stream may have arrived before this visit POST.
  // Populate any missing original attribution without overwriting known UTMs.
  const missing=fields.map(f=>f+"=CASE WHEN COALESCE("+f+",'')='' THEN ? ELSE "+f+" END").join(',');
  await db.prepare('UPDATE landing_page_visits SET '+missing+' WHERE page=? AND session_id=? AND visited_at>=?')
    .bind(...vals,page,session,cutoff).run();
  if(visitor)await db.prepare('UPDATE landing_page_visits SET visitor_id=COALESCE(visitor_id,?) WHERE page=? AND session_id=? AND visited_at>=?').bind(visitor,page,session,cutoff).run();
  return json({ok:true,tracked:(result.meta?.changes||0)>0});
 }catch{return json({ok:false,error:'storage_unavailable'},503)}
}
export function onRequest(){return json({ok:false},405)}

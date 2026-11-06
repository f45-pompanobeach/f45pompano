import {eventDb,json} from '../../leads/_shared.js';
import {getPage} from '../../landing/_shared.js';

// First-party event only: confirms a permitted click on the social trial checkout link.
// It does not change navigation or claim a purchase was completed.
export async function onRequestPost({request,env}){
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({ok:false},403)}catch{return json({ok:false},403)}}
 if(Number(request.headers.get('content-length')||0)>4096)return json({ok:false},413);
 let d;try{d=await request.json()}catch{return json({ok:false},400)}
 if(d?.page!=='social-trial'||!/^[a-f0-9]{32}$/.test(String(d?.session||'')))return json({ok:false},400);
 try{const p=await getPage(env,'social-trial');if(p?.trackingMode==='off')return json({ok:true,tracked:false})}catch{return json({ok:false},503)}
 const db=eventDb(env);if(!db)return json({ok:false},503);
 try{
  await db.prepare('CREATE TABLE IF NOT EXISTS landing_page_visits (id TEXT PRIMARY KEY,visited_at TEXT NOT NULL,page TEXT NOT NULL,session_id TEXT NOT NULL)').run();
  const cols=await db.prepare('PRAGMA table_info(landing_page_visits)').all();
  for(const col of ['mindbody_clicked_at','utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id','referrer']){
   if(!(cols.results||[]).some(c=>c.name===col))await db.prepare('ALTER TABLE landing_page_visits ADD COLUMN '+col+' TEXT').run().catch(e=>{if(!String(e).includes('duplicate column'))throw e});
  }
  const now=new Date(),time=now.toISOString();
  const v=k=>String(d?.[k]||'').trim().slice(0,k==='referrer'?400:160);
  // A fast eligible click can race with the initial visit request.
  // Preserve one visit per browser-tab session even after Safari restores it.
  await db.prepare(`INSERT INTO landing_page_visits(id,visited_at,page,session_id,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,ad_id,referrer)
    SELECT ?,?,'social-trial',?,?,?,?,?,?,?,?,?
    WHERE NOT EXISTS (SELECT 1 FROM landing_page_visits WHERE page='social-trial' AND session_id=?)`)
   .bind(crypto.randomUUID(),time,d.session,v('utm_source'),v('utm_medium'),v('utm_campaign'),v('utm_content'),v('utm_term'),v('utm_id'),v('ad_id'),v('referrer'),d.session).run();
  const result=await db.prepare(`UPDATE landing_page_visits SET mindbody_clicked_at=COALESCE(mindbody_clicked_at,?)
    WHERE id=(SELECT id FROM landing_page_visits WHERE page='social-trial' AND session_id=? ORDER BY visited_at DESC LIMIT 1)`)
   .bind(time,d.session).run();
  return json({ok:true,tracked:Number(result?.meta?.changes||0)>0});
 }catch{return json({ok:false,error:'tracking_unavailable'},503)}
}

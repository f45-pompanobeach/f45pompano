import {eventDb} from '../leads/_shared.js';
import {networkToken} from './_diagnostics.js';

// Independent record of the HTML navigation request, not an additional
// landing-page visit or email. No IP, full UA, or full referrer URL retained.
const short=(v,n=90)=>String(v||'').trim().slice(0,n).replace(/[\u0000-\u001f]/g,'');
export async function ensureRequestAuditSchema(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS page_tracking_request_audit(
  id TEXT PRIMARY KEY, requested_at TEXT NOT NULL, page TEXT NOT NULL,
  referrer_domain TEXT, fetch_site TEXT, fetch_mode TEXT, fetch_dest TEXT,
  network_hash TEXT, asn TEXT, network_org TEXT, country TEXT, bot_signal TEXT
 )`).run();
}
export async function recordHtmlRequest(context,{id,page}){
 try{
  const db=eventDb(context.env);if(!db)return;
  const request=context.request,cf=request.cf||{},ua=request.headers.get('user-agent')||'';
  const headers=request.headers;
  let referringDomain='';
  try{
   const ref=headers.get('referer')||'';
   referringDomain=ref?new URL(ref).hostname.slice(0,100):'';
  }catch{}
  const verified=cf.botManagement?.verifiedBot===true;
  const score=Number(cf.botManagement?.score);
  const knownUA=/(?:facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|googlebot|bingbot|headlesschrome|lighthouse|pagespeed)/i.test(ua);
  const signal=verified?'verified_bot':knownUA?'automation_user_agent':
   Number.isFinite(score)&&score>=1&&score<=99?'score:'+score:'unavailable';
  await ensureRequestAuditSchema(db);
  await db.prepare(`INSERT OR IGNORE INTO page_tracking_request_audit
  (id,requested_at,page,referrer_domain,fetch_site,fetch_mode,fetch_dest,
    network_hash,asn,network_org,country,bot_signal)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
   .bind(id,new Date().toISOString(),page,referringDomain,
    short(headers.get('sec-fetch-site'),25),
    short(headers.get('sec-fetch-mode'),25),
    short(headers.get('sec-fetch-dest'),25),
    await networkToken(request,context.env),short(cf.asn,18),
    short(cf.asOrganization,100),short(cf.country,3),signal).run();
  // Keep exact request audits for 30 days, correlation tokens only 7 days.
  await db.prepare('DELETE FROM page_tracking_request_audit WHERE requested_at<?')
   .bind(new Date(Date.now()-30*86400000).toISOString()).run();
  await db.prepare("UPDATE page_tracking_request_audit SET network_hash='' WHERE network_hash<>'' AND requested_at<?")
   .bind(new Date(Date.now()-7*86400000).toISOString()).run();
 }catch(error){console.error('Noncritical HTML request audit failed',error?.message||error)}
}

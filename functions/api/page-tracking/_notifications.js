import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';
// Meta/social link previews can start independent JS contexts with fresh
// sessionStorage IDs. Preserve those visits, but avoid emailing every rapid
// repeat from the same page and network/browser. Raw IPs are never stored.
const ALERT_COOLDOWN_MS=20*60*1000;
const BOT_UA=/(?:facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|googlebot|bingbot|headlesschrome|lighthouse|pagespeed)/i;
async function notificationSignature(context,visit){
 const request=context.request;
 if(!request)return null;
 const ua=String(request.headers.get('user-agent')||'').slice(0,320);
 const ip=String(request.headers.get('cf-connecting-ip')||'').trim();
 const visitor=String(visit.visitor_id||'');
 const identity=ip&&ua?'network:'+ip+'|'+ua:/^[a-f0-9]{32}$/.test(visitor)?'browser:'+visitor:null;
 const secret=String(context.env?.EMAIL_GATEWAY_APP_KEY||'');
 if(!identity||!secret)return null;
 const bytes=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,bytes.encode(visit.page+'|'+identity));
 return Array.from(new Uint8Array(signature),v=>v.toString(16).padStart(2,'0')).join('');
}
// Backstop for distributed Meta preview bursts that use different browser
// signatures: at most four initial social-trial VISIT alerts within 90 seconds.
// No limit is applied to lead-submission or meaningful-activity emails.
const SURGE_WINDOW_MS=90*1000;
const SURGE_EMAIL_LIMIT=4;
async function excessiveSocialPageBurst(db,page){
 if(page!=='social-trial')return false;
 await db.prepare('CREATE TABLE IF NOT EXISTS page_tracking_alert_surge (page TEXT PRIMARY KEY,window_started INTEGER NOT NULL,hit_count INTEGER NOT NULL)').run();
 const now=Date.now(),cutoff=now-SURGE_WINDOW_MS;
 await db.prepare('INSERT OR IGNORE INTO page_tracking_alert_surge(page,window_started,hit_count) VALUES(?,?,0)')
  .bind(page,now).run();
 await db.prepare('UPDATE page_tracking_alert_surge SET hit_count=CASE WHEN window_started<? THEN 1 ELSE hit_count+1 END,window_started=CASE WHEN window_started<? THEN ? ELSE window_started END WHERE page=?')
  .bind(cutoff,cutoff,now,page).run();
 const row=await db.prepare('SELECT hit_count FROM page_tracking_alert_surge WHERE page=?').bind(page).first();
 return Number(row?.hit_count||0)>SURGE_EMAIL_LIMIT;
}
async function suppressRapidRepeat(context,db,visit){
 const ua=String(context.request?.headers.get('user-agent')||'');
 if(BOT_UA.test(ua))return 'automated_preview';
 const signature=await notificationSignature(context,visit);
 if(!signature)return await excessiveSocialPageBurst(db,visit.page)?'social_trial_burst':'';
 await db.prepare('CREATE TABLE IF NOT EXISTS page_tracking_alert_burst_guard (signature TEXT PRIMARY KEY,last_alert_at INTEGER NOT NULL)').run();
 const now=Date.now();
 const claim=await db.prepare('INSERT INTO page_tracking_alert_burst_guard(signature,last_alert_at) VALUES(?,?) ON CONFLICT(signature) DO UPDATE SET last_alert_at=excluded.last_alert_at WHERE last_alert_at<?')
  .bind(signature,now,now-ALERT_COOLDOWN_MS).run();
 if(Number(claim.meta?.changes||0)!==1)return 'rapid_repeat';
 return await excessiveSocialPageBurst(db,visit.page)?'social_trial_burst':'';
}
export async function notifyNewTrackingVisit(context,db,visit){
 try{
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_alert_deliveries (visit_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', gateway_id TEXT, error TEXT)").run();
  const claim=await db.prepare("INSERT OR IGNORE INTO page_tracking_alert_deliveries(visit_id,created_at,status) VALUES(?,?,'queued')").bind(visit.id,new Date().toISOString()).run();
  if(Number(claim.meta?.changes||0)!==1)return;
  // This guard applies only to new-visit emails, not tracking rows, activity
  // timelines, or the separate new-lead notification workflow.
  let suppressed='';
  try{suppressed=await suppressRapidRepeat(context,db,visit)}
  catch(error){console.error('Page Tracking repeat-alert guard unavailable:',error?.message||error)}
  if(suppressed){
   await db.prepare("UPDATE page_tracking_alert_deliveries SET status='suppressed',error=? WHERE visit_id=?")
    .bind(suppressed,visit.id).run();
   return;
  }
  const task=(async()=>{
   try{
    const result=await sendGatewayEmail(context.env,{
     idempotencyKey:'tracking-visit-'+visit.id,
     to:settings.recipient,
     subject:'F45 Page Tracking: New visit - '+visit.page,
     fields:{
      'Landing / Partner Page':visit.page,
      'Date / Time (UTC)':visit.visited_at,
      'Source':visit.utm_source||'Direct / unknown',
      'Medium':visit.utm_medium||'',
      'Campaign':visit.utm_campaign||'',
      'Ad / Content':visit.utm_content||'',
      'Referrer':visit.referrer||'',
      'View Tracking':'https://f45pompano.com/leads-trials/page-tracking/'
     }
    });
    if(!result.accepted)throw Error('gateway_not_configured');
    await db.prepare("UPDATE page_tracking_alert_deliveries SET status='accepted',gateway_id=? WHERE visit_id=?").bind(result.id,visit.id).run();
   }catch(error){
    console.error('Page Tracking alert failed:',error?.message||error);
    await db.prepare("UPDATE page_tracking_alert_deliveries SET status='failed',error=? WHERE visit_id=?").bind(String(error?.message||error).slice(0,120),visit.id).run().catch(()=>{});
   }
  })();
  if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
 }catch(error){console.error('Page Tracking notification setup failed:',error?.message||error)}
}

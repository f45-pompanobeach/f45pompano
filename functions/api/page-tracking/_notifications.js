import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';
// Only known automated previews are excluded. A new session must not be
// suppressed because another session shares a visitor ID, IP or user agent.
const BOT_UA=/(?:facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|googlebot|bingbot|headlesschrome|lighthouse|pagespeed)/i;
export async function notifyNewTrackingVisit(context,db,visit){
 try{
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_alert_deliveries (visit_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', gateway_id TEXT, error TEXT)").run();
  const claim=await db.prepare("INSERT OR IGNORE INTO page_tracking_alert_deliveries(visit_id,created_at,status) VALUES(?,?,'queued')").bind(visit.id,new Date().toISOString()).run();
  if(Number(claim.meta?.changes||0)!==1)return;
  // A visit and its activity POST can race to create separate rows. Claim
  // email once per actual page + browser-tab session, not just per visit ID.
  if(/^[a-f0-9]{32}$/.test(String(visit.session_id||''))){
   await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_session_alerts (page TEXT NOT NULL,session_id TEXT NOT NULL,visit_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(page,session_id))").run();
   const unique=await db.prepare("INSERT OR IGNORE INTO page_tracking_session_alerts(page,session_id,visit_id,created_at) VALUES(?,?,?,?)")
    .bind(visit.page,visit.session_id,visit.id,new Date().toISOString()).run();
   if(Number(unique.meta?.changes||0)!==1){
    await db.prepare("UPDATE page_tracking_alert_deliveries SET status='suppressed',error=? WHERE visit_id=?")
     .bind('same_browser_session',visit.id).run();
    return;
   }
  }
  // The database session claim is exact-once. No global throttling:
  // different browser sessions must be permitted their own visit alerts.
  const ua=String(context.request?.headers.get('user-agent')||'');
  const verifiedBot=context.request?.cf?.botManagement?.verifiedBot===true;
  // The HTML navigation can carry a known automation user-agent even when
  // the later JavaScript POST has a different request context. Correlate by
  // the short-lived request ID only; never block by Google's or Meta's ASN.
  let htmlAutomation=false;
  if(visit.request_id){
   const audit=await db.prepare('SELECT bot_signal FROM page_tracking_request_audit WHERE id=? LIMIT 1')
    .bind(visit.request_id).first().catch(()=>null);
   htmlAutomation=['automation_user_agent','verified_bot'].includes(audit?.bot_signal);
  }
  if(BOT_UA.test(ua)||verifiedBot||htmlAutomation){
   await db.prepare("UPDATE page_tracking_alert_deliveries SET status='suppressed',error=? WHERE visit_id=?")
    .bind('confirmed_automation',visit.id).run();
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

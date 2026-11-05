import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';
export async function notifyNewTrackingVisit(context,db,visit){
 try{
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_alert_deliveries (visit_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', gateway_id TEXT, error TEXT)").run();
  const claim=await db.prepare("INSERT OR IGNORE INTO page_tracking_alert_deliveries(visit_id,created_at,status) VALUES(?,?,'queued')").bind(visit.id,new Date().toISOString()).run();
  if(Number(claim.meta?.changes||0)!==1)return;
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

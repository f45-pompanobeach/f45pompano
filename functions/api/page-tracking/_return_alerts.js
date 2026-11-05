import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';

// Notify only for NEW meaningful actions actually saved on an existing tracking row.
// No elapsed-time requirement, no new visit, and no email for views/restores/checkboxes.
const meaningful=e=>
 e.event_name==='checkout_clicked'||
 e.event_name==='trial_cta_clicked'||
 e.event_name==='button_clicked'||
 e.event_name==='form_submit_attempt'||
 e.event_name==='form_submitted'||
 (e.event_name==='field_edited'&&!!String(e.field_value||'').trim());
const describe=e=>{
 if(e.event_name==='checkout_clicked')return 'Clicked Mindbody checkout';
 if(e.event_name==='trial_cta_clicked')return 'Clicked trial offer button';
 if(e.event_name==='form_submit_attempt')return 'Attempted trial form submission';
 if(e.event_name==='form_submitted')return 'Submitted trial form';
 if(e.event_name==='button_clicked')return 'Clicked button: '+String(e.target||'button').slice(0,65);
 return 'Entered or changed '+String(e.field_name||'contact field').replace(/_/g,' ');
};
const eastern=iso=>new Date(iso).toLocaleString('en-US',{
 timeZone:'America/New_York',dateStyle:'medium',timeStyle:'medium'
});

export async function notifyReturningActivity(context,db,{visitId,page,events}){
 const fresh=events.filter(meaningful);
 if(!fresh.length)return;
 try{
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  // The browser may retry a batch. A persistent claim prevents duplicate emails.
  // A batch with several actions produces ONE notification listing those actions.
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_activity_alert_deliveries (event_id TEXT PRIMARY KEY,visit_id TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',gateway_id TEXT,error TEXT)").run();
  const anchor=fresh[0];
  const claim=await db.prepare("INSERT OR IGNORE INTO page_tracking_activity_alert_deliveries(event_id,visit_id,created_at,status) VALUES(?,?,?,'queued')")
   .bind(anchor.id,visitId,new Date().toISOString()).run();
  if(Number(claim.meta?.changes||0)!==1)return;
  const task=(async()=>{
   try{
    const result=await sendGatewayEmail(context.env,{
     idempotencyKey:'tracking-activity-'+anchor.id,
     to:settings.recipient,
     subject:'F45 Page Tracking: New activity on previous visit - '+page,
     fields:{
      'Landing / Partner Page':page,
      'New Activity':fresh.map(describe).join('; ').slice(0,500),
      'Activity Date / Time (Eastern)':eastern(anchor.at),
      'Tracking Record':'https://f45pompano.com/leads-trials/page-tracking/?visit='+encodeURIComponent(visitId)
     }
    });
    if(!result.accepted)throw Error('gateway_not_configured');
    await db.prepare("UPDATE page_tracking_activity_alert_deliveries SET status='accepted',gateway_id=? WHERE event_id=?")
     .bind(result.id,anchor.id).run();
   }catch(error){
    console.error('Tracking activity email failed:',error?.message||error);
    await db.prepare("UPDATE page_tracking_activity_alert_deliveries SET status='failed',error=? WHERE event_id=?")
     .bind(String(error?.message||error).slice(0,120),anchor.id).run().catch(()=>{});
   }
  })();
  if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
 }catch(error){console.error('Tracking activity notification setup failed:',error?.message||error)}
}

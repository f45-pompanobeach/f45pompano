import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';

// Initial visit: only the existing "new visit" email.
// Once the browser leaves and returns: at most one follow-up email for NEW
// meaningful activity during that return. No time threshold and no new row.
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
 if(!events.length)return;
 try{
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_activity_periods (visit_id TEXT PRIMARY KEY,period INTEGER NOT NULL DEFAULT 0,away INTEGER NOT NULL DEFAULT 0,notified_period INTEGER NOT NULL DEFAULT 0)").run();
  // Create the state once. A previously active row may first report a
  // page_resumed event after an older script version; that is a return.
  const created=await db.prepare("INSERT OR IGNORE INTO page_tracking_activity_periods(visit_id,period,away,notified_period) VALUES(?,0,0,0)")
   .bind(visitId).run();
  const firstState=Number(created.meta?.changes||0)===1;
  // If an initial page-view alert was suppressed as a repeat/preview, a later
  // real trial action must still be able to notify the studio once.
  let initialAlertSuppressed=false;
  if(events.some(meaningful)){
   try{
    const row=await db.prepare("SELECT 1 AS suppressed FROM page_tracking_alert_deliveries WHERE visit_id=? AND status='suppressed' LIMIT 1").bind(visitId).first();
    initialAlertSuppressed=!!row;
   }catch{}
  }
  let state=await db.prepare('SELECT period,away,notified_period FROM page_tracking_activity_periods WHERE visit_id=?')
   .bind(visitId).first();
  if(!state)return;
  let period=Number(state.period),away=Number(state.away),notified=Number(state.notified_period);
  let action=null,actionPeriod=0;
  // Events are stored in chronological browser order. An exit snapshot should
  // never qualify as activity from the NEXT visit just because it shares a batch.
  for(const event of events){
   if(event.event_name==='page_hidden'){
    away=1;
   }else if(event.event_name==='page_resumed'||event.event_name==='page_view'){
    if(away||(firstState&&event.event_name==='page_resumed')){
     period+=1;away=0;
    }
   }else if(meaningful(event)&&(period>0||initialAlertSuppressed)&&(notified<period||(period===0&&initialAlertSuppressed&&notified===0))&&!away&&!action){
    action=event;actionPeriod=period;
   }
  }
  // Store state before claiming an email. Same-tab activity remains linked to
  // its original tracking record, regardless of how long the tab was inactive.
  await db.prepare('UPDATE page_tracking_activity_periods SET period=?,away=? WHERE visit_id=?')
   .bind(period,away,visitId).run();
  if(!action)return;
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  // Only the first qualifying event in a return period can claim its email.
  const claim=actionPeriod===0
   ?await db.prepare('UPDATE page_tracking_activity_periods SET notified_period=-1 WHERE visit_id=? AND period=0 AND notified_period=0')
     .bind(visitId).run()
   :await db.prepare('UPDATE page_tracking_activity_periods SET notified_period=? WHERE visit_id=? AND notified_period<? AND period>=?')
     .bind(actionPeriod,visitId,actionPeriod,actionPeriod).run();
  if(Number(claim.meta?.changes||0)!==1)return;
  const task=(async()=>{
   try{
    const result=await sendGatewayEmail(context.env,{
     idempotencyKey:'tracking-return-period-'+visitId+'-'+actionPeriod,
     to:settings.recipient,
     subject:'F45 Page Tracking: New activity on previous visit - '+page,
     fields:{
      'Landing / Partner Page':page,
      'New Activity':describe(action),
      'Activity Date / Time (Eastern)':eastern(action.at),
      'Tracking Record':'https://f45pompano.com/leads-trials/page-tracking/?visit='+encodeURIComponent(visitId)
     }
    });
    if(!result.accepted)throw Error('gateway_not_configured');
   }catch(error){console.error('Returning activity email failed:',error?.message||error)}
  })();
  if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
 }catch(error){console.error('Returning activity tracking failed:',error?.message||error)}
}

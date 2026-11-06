import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';

// A visit earns at most ONE consolidated activity notification for its entire
// browser-tab session. Field changes are recorded immediately, but the email
// waits until a meaningful CTA/form button is clicked or the page is left.
// Checkbox changes, reloads, and page resume alone are never email-worthy.
const actualAction=e=>[
 'checkout_clicked','checkout_blocked','trial_cta_clicked','button_clicked',
 'form_submit_attempt','form_submitted','trial_unlocked'
].includes(e.event_name);
const eventHasContact=e=>e.event_name==='field_edited'&&!!String(e.field_value||'').trim();
const activityEvent=e=>actualAction(e)||eventHasContact(e);
const eastern=iso=>new Date(iso).toLocaleString('en-US',{
 timeZone:'America/New_York',dateStyle:'medium',timeStyle:'medium'
});
const describe=e=>{
 if(e.event_name==='checkout_clicked')return 'Clicked Mindbody checkout link';
 if(e.event_name==='checkout_blocked')return 'Tried checkout before confirming eligibility';
 if(e.event_name==='trial_unlocked')return 'Unlocked trial after submitting lead details';
 if(e.event_name==='form_submitted')return 'Submitted lead form';
 if(e.event_name==='form_submit_attempt')return 'Clicked lead form submission button';
 if(e.event_name==='trial_cta_clicked')return 'Clicked trial offer button';
 return 'Clicked button: '+String(e.target||'button').slice(0,65);
};

export async function notifyReturningActivity(context,db,{visitId,page,session,events}){
 if(!events?.length)return;
 try{
  // The legacy table identifies sessions that already received an activity
  // email under the previous per-return rules. Never email them again.
  const prior=await db.prepare('SELECT notified_period FROM page_tracking_activity_periods WHERE visit_id=?')
   .bind(visitId).first().catch(()=>null);
  if(prior&&Number(prior.notified_period)!==0)return;

  // Form submission is asynchronous. Wait for the success/unlock event (or
  // departure), so the notification links to the completed form flow.
  const notifyAction=e=>actualAction(e)&&e.event_name!=='form_submit_attempt';
  const hasTrigger=events.some(e=>notifyAction(e)||e.event_name==='page_hidden');
  if(!hasTrigger)return;
  // Look across saved batches so one email can describe all progress,
  // rather than a single first-name edit or isolated button click.
  const summary=await db.prepare(`SELECT
   SUM(CASE WHEN event_name='field_edited' AND COALESCE(field_value,'')<>'' THEN 1 ELSE 0 END) AS field_changes,
   SUM(CASE WHEN event_name IN ('checkout_clicked','checkout_blocked','trial_cta_clicked','button_clicked','form_submit_attempt','form_submitted','trial_unlocked') THEN 1 ELSE 0 END) AS button_actions,
   MAX(CASE WHEN event_name IN ('checkout_clicked','checkout_blocked','trial_cta_clicked','button_clicked','form_submit_attempt','form_submitted','trial_unlocked') THEN created_at ELSE NULL END) AS last_action_at
   FROM landing_page_activity WHERE page=? AND session_id=?`).bind(page,session).first();
  const fields=Number(summary?.field_changes||0),buttons=Number(summary?.button_actions||0);
  // An empty page visit, checkbox-only visit or browser reload never emails.
  if(fields+buttons===0)return;
  // If only text was entered, wait until the page is hidden/navigated away.
  if(!buttons&&!events.some(e=>e.event_name==='page_hidden'))return;
  // If there is an action, send when a button event is saved, not on an
  // earlier typing event. If action preceded this request, the saved state
  // still allows one consolidated email on the next trigger.
  const trigger=events.find(e=>notifyAction(e))||events.find(e=>e.event_name==='page_hidden');
  if(!trigger)return;
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_activity_alerts (page TEXT NOT NULL,session_id TEXT NOT NULL,visit_id TEXT NOT NULL,created_at TEXT NOT NULL,trigger TEXT NOT NULL,PRIMARY KEY(page,session_id))").run();
  const claim=await db.prepare('INSERT OR IGNORE INTO page_tracking_activity_alerts(page,session_id,visit_id,created_at,trigger) VALUES(?,?,?,?,?)')
   .bind(page,session,visitId,new Date().toISOString(),trigger.event_name).run();
  if(Number(claim.meta?.changes||0)!==1)return;
  // Email contains a summary and direct activity link, not partial contact
  // fields. The timeline is already persisted when this function runs.
  const action=events.filter(notifyAction).at(-1);
  const task=(async()=>{
   try{
    const result=await sendGatewayEmail(context.env,{
     idempotencyKey:'tracking-activity-session-'+visitId,
     to:settings.recipient,
     subject:'F45 Page Tracking: New activity on previous visit - '+page,
     fields:{
      'Landing / Partner Page':page,
      'Activity Summary':fields+' contact-field change(s), '+buttons+' button/form action(s)',
      'Notification Trigger':action?describe(action):'Visitor left the page after entering information',
      'Activity Date / Time (Eastern)':eastern(trigger.at),
      'View Complete Activity':'https://f45pompano.com/leads-trials/page-tracking/?visit='+encodeURIComponent(visitId)
     }
    });
    if(!result.accepted)throw Error('gateway_not_configured');
   }catch(error){console.error('Consolidated activity email failed:',error?.message||error)}
  })();
  if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
 }catch(error){console.error('Activity notification check failed:',error?.message||error)}
}

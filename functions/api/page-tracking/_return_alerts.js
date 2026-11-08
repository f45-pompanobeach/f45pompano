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

// A genuine new Mindbody navigation after an earlier activity notification
// deserves a separate alert. Claim at most one follow-up checkout alert per
// session to prevent repeated taps, retries, or beacon replays from spamming.
async function notifyLaterCheckout(context,db,{visitId,page,session,events}){
 const checkout=events.find(e=>e.event_name==='checkout_clicked');
 if(!checkout)return;
 const previous=await db.prepare('SELECT created_at FROM page_tracking_activity_alerts WHERE page=? AND session_id=?')
  .bind(page,session).first().catch(()=>null);
 if(!previous)return; // The normal first-activity alert handles new sessions.
 const settings=await trackingNotificationConfig(db);
 if(!settings.enabled)return;
 await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_checkout_followups (page TEXT NOT NULL,session_id TEXT NOT NULL,visit_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(page,session_id))").run();
 const claim=await db.prepare("INSERT OR IGNORE INTO page_tracking_checkout_followups(page,session_id,visit_id,created_at) VALUES(?,?,?,?)")
  .bind(page,session,visitId,new Date().toISOString()).run();
 if(Number(claim.meta?.changes||0)!==1)return;
 const task=(async()=>{
  try{
   const result=await sendGatewayEmail(context.env,{
    idempotencyKey:'tracking-checkout-followup-'+visitId,
    to:settings.recipient,
    subject:'F45 Page Tracking: Mindbody clicked on previous visit - '+page,
    fields:{
     'Landing / Partner Page':page,
     'New Activity':'Clicked Mindbody checkout link',
     'Activity Date / Time (Eastern)':eastern(checkout.at),
     'View Complete Activity':'https://f45pompano.com/leads-trials/page-tracking/?visit='+encodeURIComponent(visitId)
    }
   });
   if(!result.accepted)throw Error('gateway_not_configured');
  }catch(error){console.error('Follow-up checkout email failed:',error?.message||error)}
 })();
 if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
}

// Follow-up activity alerts are independent of the first-activity and Mindbody
// alerts. Only NEW edits after the first email qualify, and only on departure.
// A form submission is covered by the New Lead email, not another activity email.
async function notifyLaterMeaningfulActivity(context,db,{visitId,page,session,events}){
 const departing=events.some(e=>e.event_name==='page_hidden');
 const actionEvents=new Set(['trial_cta_clicked','button_clicked','checkout_blocked']);
 const actionable=events.find(e=>actionEvents.has(e.event_name));
 if(!departing&&!actionable)return;
 const first=await db.prepare('SELECT created_at FROM page_tracking_activity_alerts WHERE page=? AND session_id=?')
  .bind(page,session).first().catch(()=>null);
 if(!first?.created_at)return; // Initial activity notification remains unchanged.
 const latestLead=await db.prepare("SELECT MAX(created_at) AS at FROM landing_page_activity WHERE page=? AND session_id=? AND event_name IN ('form_submitted','trial_unlocked')")
  .bind(page,session).first();
 // Only saved events AFTER the first activity email (and any completed form)
 // may initiate another alert. Use event timestamps rather than row insertion
 // times because Safari beacon requests can arrive out of order.
 const baseline=latestLead?.at&&latestLead.at>first.created_at?latestLead.at:first.created_at;
 await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_repeat_activity_alerts (page TEXT NOT NULL,session_id TEXT NOT NULL,first_event_id TEXT NOT NULL,visit_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(page,session_id,first_event_id))").run();
 const recent=await db.prepare(`SELECT id,created_at,event_name FROM landing_page_activity
  WHERE page=? AND session_id=? AND created_at>?
    AND event_name IN ('field_edited','trial_cta_clicked','button_clicked','checkout_blocked')
  ORDER BY created_at ASC,rowid ASC LIMIT 200`).bind(page,session,baseline).all();
 const actions=recent.results||[];
 if(!actions.length)return; // Hiding, reopening, or checking boxes is passive.
 // Distinguish each meaningful burst by its first previously unnotified event.
 // Claiming the earliest event is stable across duplicate visibility beacons.
 const sent=await db.prepare("SELECT first_event_id FROM page_tracking_repeat_activity_alerts WHERE page=? AND session_id=?")
  .bind(page,session).all();
 const already=new Set((sent.results||[]).map(x=>x.first_event_id));
 // The most recent claimed burst marks the beginning of an already notified
 // interval. Do not re-email its actions after a later page_hidden event.
 const last=await db.prepare("SELECT created_at FROM page_tracking_repeat_activity_alerts WHERE page=? AND session_id=? ORDER BY created_at DESC LIMIT 1")
  .bind(page,session).first();
 // Use the latest original event timestamp as a boundary, rather than server
 // receipt time, so delayed event batches do not repeat earlier activity.
 const prior=await db.prepare("SELECT MAX(a.created_at) AS at FROM landing_page_activity a JOIN page_tracking_repeat_activity_alerts n ON n.first_event_id=a.id WHERE n.page=? AND n.session_id=?")
  .bind(page,session).first();
 const newActions=actions.filter(e=>!prior?.at||e.created_at>prior.at);
 if(!newActions.length)return;
 const firstNew=newActions[0];
 // Never email separately for form-entry activity that culminated in a lead.
 const hasNewText=newActions.some(e=>e.event_name==='field_edited');
 const hasNewAction=newActions.some(e=>actionEvents.has(e.event_name));
 if(!hasNewAction&&!departing)return;
 // A later click alerts immediately; a text-only return alerts on page hide.
 const settings=await trackingNotificationConfig(db);
 if(!settings.enabled)return;
 const claim=await db.prepare("INSERT OR IGNORE INTO page_tracking_repeat_activity_alerts(page,session_id,first_event_id,visit_id,created_at) VALUES(?,?,?,?,?)")
  .bind(page,session,firstNew.id,visitId,new Date().toISOString()).run();
 if(Number(claim.meta?.changes||0)!==1)return;
 const lastAction=newActions.filter(e=>actionEvents.has(e.event_name)).at(-1);
 const newest=newActions.at(-1);
 const task=(async()=>{
  try{
   const result=await sendGatewayEmail(context.env,{
    idempotencyKey:'tracking-repeat-activity-'+firstNew.id,
    to:settings.recipient,
    subject:'F45 Page Tracking: Additional activity on previous visit - '+page,
    fields:{
     'Landing / Partner Page':page,
     'New Activity':newActions.filter(e=>e.event_name==='field_edited').length+' form edit(s), '+newActions.filter(e=>actionEvents.has(e.event_name)).length+' button action(s)',
     'Notification Trigger':lastAction?describe(lastAction):'Visitor left the page after entering more information',
     'Activity Date / Time (Eastern)':eastern(newest.created_at),
     'View Complete Activity':'https://f45pompano.com/leads-trials/page-tracking/?visit='+encodeURIComponent(visitId)
    }
   });
   if(!result.accepted)throw Error('gateway_not_configured');
  }catch(error){console.error('Repeat activity notification failed:',error?.message||error)}
 })();
 if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
}

export async function notifyReturningActivity(context,db,{visitId,page,session,events}){
 if(!events?.length)return;
 try{
  await notifyLaterCheckout(context,db,{visitId,page,session,events});
  await notifyLaterMeaningfulActivity(context,db,{visitId,page,session,events});
  // The legacy table identifies sessions that already received an activity
  // email under the previous per-return rules. Never email them again.
  const prior=await db.prepare('SELECT notified_period FROM page_tracking_activity_periods WHERE visit_id=?')
   .bind(visitId).first().catch(()=>null);
  if(prior&&Number(prior.notified_period)!==0)return;

  // Form submission is asynchronous. Wait for the success/unlock event (or
  // departure), so the notification links to the completed form flow.
  const notifyAction=e=>actualAction(e)&&e.event_name!=='form_submit_attempt';
  // Beacon and fetch requests can reach D1 out of order when a tab closes.
  // If a delayed field edit is saved after its already-recorded page_hidden,
  // send the one departure email now, not an email on ordinary typing.
  let delayedDeparture=null;
  if(events.some(e=>e.event_name==='field_edited')&&!events.some(e=>notifyAction(e)||e.event_name==='page_hidden')){
   const lastExit=await db.prepare("SELECT created_at FROM landing_page_activity WHERE page=? AND session_id=? AND event_name='page_hidden' ORDER BY created_at DESC LIMIT 1")
    .bind(page,session).first();
   if(lastExit?.created_at&&events.some(e=>e.event_name==='field_edited'&&e.at<=lastExit.created_at))
    delayedDeparture={event_name:'page_hidden',at:lastExit.created_at};
  }
  const hasTrigger=events.some(e=>notifyAction(e)||e.event_name==='page_hidden')||!!delayedDeparture;
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
  if(!buttons&&!events.some(e=>e.event_name==='page_hidden')&&!delayedDeparture)return;
  // If there is an action, send when a button event is saved, not on an
  // earlier typing event. If action preceded this request, the saved state
  // still allows one consolidated email on the next trigger.
  const trigger=events.find(e=>notifyAction(e))||events.find(e=>e.event_name==='page_hidden')||delayedDeparture;
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

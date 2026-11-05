import {sendGatewayEmail} from '../leads/_email_gateway.js';
import {trackingNotificationConfig} from './admin/notifications.js';

// A return is an actual reopening of an existing tab after 30+ quiet minutes.
// Views, restores and checkboxes are logged, but never emailed by themselves.
const RETURN_GAP_MS=30*60*1000;
const qualifying=e=>
  e.event_name==='checkout_clicked'||
  e.event_name==='form_submit_attempt'||
  e.event_name==='form_submitted'||
  e.event_name==='button_clicked'||
  (e.event_name==='field_edited'&&!!String(e.field_value||'').trim());
const describe=e=>{
 if(e.event_name==='checkout_clicked')return 'Clicked Mindbody checkout';
 if(e.event_name==='form_submit_attempt')return 'Clicked the trial offer / submit button';
 if(e.event_name==='form_submitted')return 'Submitted the trial form';
 if(e.event_name==='button_clicked')return 'Clicked button: '+String(e.target||'button').slice(0,65);
 return 'Entered or edited '+String(e.field_name||'a contact field').replace(/_/g,' ');
};
const inEastern=iso=>new Date(iso).toLocaleString('en-US',{
 timeZone:'America/New_York',dateStyle:'medium',timeStyle:'medium'
});

export async function notifyReturningActivity(context,db,{visitId,page,priorActivityAt,events}){
 if(!priorActivityAt||!events.length)return;
 try{
  await db.prepare("CREATE TABLE IF NOT EXISTS page_tracking_return_state (visit_id TEXT PRIMARY KEY, resumed_at TEXT NOT NULL, notified_at TEXT)").run();
  const now=new Date().toISOString();
  const isReturn=Date.now()-Date.parse(priorActivityAt)>=RETURN_GAP_MS &&
   events.some(e=>e.event_name==='page_resumed'||e.event_name==='page_view');
  if(isReturn){
   await db.prepare("INSERT INTO page_tracking_return_state(visit_id,resumed_at,notified_at) VALUES(?,?,NULL) ON CONFLICT(visit_id) DO UPDATE SET resumed_at=excluded.resumed_at,notified_at=NULL")
    .bind(visitId,now).run();
  }
  const state=await db.prepare("SELECT resumed_at,notified_at FROM page_tracking_return_state WHERE visit_id=?").bind(visitId).first();
  if(!state||state.notified_at)return;
  const relevant=events.filter(qualifying);
  let action=null;
  for(const e of relevant){
   if(e.event_name!=='field_edited'){action=e;break}
   // Avoid notifying for an unchanged value that was merely restored/autofilled.
   const previous=await db.prepare("SELECT field_value FROM landing_page_activity WHERE visit_id=? AND field_name=? AND field_value IS NOT NULL AND id<>? AND created_at<=? ORDER BY created_at DESC,rowid DESC LIMIT 1")
    .bind(visitId,e.field_name,e.id,e.at).first();
   if(!previous||previous.field_value!==e.field_value){action=e;break}
  }
  if(!action)return;
  const settings=await trackingNotificationConfig(db);
  if(!settings.enabled)return;
  // Conditional atomic claim permits only one email per return window.
  const claim=await db.prepare("UPDATE page_tracking_return_state SET notified_at=? WHERE visit_id=? AND resumed_at=? AND notified_at IS NULL")
   .bind(now,visitId,state.resumed_at).run();
  if(Number(claim.meta?.changes||0)!==1)return;
  const task=(async()=>{
   try{
    const result=await sendGatewayEmail(context.env,{
     idempotencyKey:'tracking-return-'+visitId+'-'+state.resumed_at.replace(/[^0-9]/g,''),
     to:settings.recipient,
     subject:'F45 Page Tracking: New activity on previous visit - '+page,
     fields:{
      'Landing / Partner Page':page,
      'New Activity':describe(action),
      'Activity Date / Time (Eastern)':inEastern(action.at),
      'Return Date / Time (Eastern)':inEastern(state.resumed_at),
      'Tracking Record':'https://f45pompano.com/leads-trials/page-tracking/?visit='+encodeURIComponent(visitId)
     }
    });
    if(!result.accepted)throw Error('gateway_not_configured');
   }catch(error){console.error('Returning activity email failed:',error?.message||error)}
  })();
  if(typeof context.waitUntil==='function')context.waitUntil(task);else await task;
 }catch(error){console.error('Returning activity tracking failed:',error?.message||error)}
}

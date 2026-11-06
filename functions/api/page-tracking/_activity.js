// Shared, first-party landing activity tables and input validation.
// No passwords, card details, free-text areas or form submissions are stored.
export const EVENT_NAMES=new Set([
 'page_view','field_started','field_edited','field_left','checkbox_changed',
 'form_submit_attempt','form_submitted','checkout_clicked','checkout_blocked','button_clicked','trial_cta_clicked',
 'details_toggled','link_clicked','validation_blocked','progress_opt_in','progress_opt_out','page_hidden','page_resumed'
]);
export const CONTACT_FIELDS=new Set(['first_name','last_name','email','phone','zip']);
const clean=(v,n=80)=>String(v??'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,n);
export function validIdentity(page,session,visitor){
 return /^[a-z0-9][a-z0-9-]{0,63}$/.test(page)&&/^[a-f0-9]{32}$/.test(session)&&
  (!visitor||/^[a-f0-9]{32}$/.test(visitor));
}
export async function ensureActivitySchema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS landing_page_visits (id TEXT PRIMARY KEY, visited_at TEXT NOT NULL, page TEXT NOT NULL, session_id TEXT NOT NULL)').run();
 const cols=await db.prepare('PRAGMA table_info(landing_page_visits)').all();
 if(!(cols.results||[]).some(c=>c.name==='visitor_id'))
  await db.prepare('ALTER TABLE landing_page_visits ADD COLUMN visitor_id TEXT').run()
   .catch(e=>{if(!String(e).includes('duplicate column'))throw e});
 await db.prepare(`CREATE TABLE IF NOT EXISTS landing_page_activity (
  id TEXT PRIMARY KEY, visit_id TEXT NOT NULL, page TEXT NOT NULL,
  session_id TEXT NOT NULL, visitor_id TEXT, created_at TEXT NOT NULL,
  event_name TEXT NOT NULL, target TEXT, field_name TEXT,
  field_value TEXT, consented INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT ''
 )`).run();
 await db.prepare('CREATE INDEX IF NOT EXISTS idx_landing_activity_visit ON landing_page_activity(visit_id,created_at)').run();
 await db.prepare('CREATE INDEX IF NOT EXISTS idx_landing_activity_visitor ON landing_page_activity(visitor_id,created_at)').run();
}
export function sanitizeEvent(item){
 const event_name=clean(item?.event,42);
 if(!EVENT_NAMES.has(event_name))return null;
 const field_name=clean(item?.field,35).toLowerCase().replace(/[^a-z0-9_]/g,'');
 const target=clean(item?.target,65).replace(/[^\w .\-]/g,'');
 const detail=clean(item?.detail,25).toLowerCase();
 const id=clean(item?.id,36).toLowerCase();
 if(!/^[a-f0-9-]{36}$/.test(id))return null;
 const consented=item?.consented===true;
 const provided=Date.parse(String(item?.at||''));
 const at=Number.isFinite(provided)&&Math.abs(Date.now()-provided)<15*60000
   ?new Date(provided).toISOString():new Date().toISOString();
 let field_value=null;
 if(typeof item?.value==='string'&&CONTACT_FIELDS.has(field_name)&&
    ['field_edited','field_left'].includes(event_name)){
  const raw=clean(item?.value,140);
  // Keep only narrowly-scoped contact details; never store arbitrary text.
  if(field_name==='email')field_value=raw.toLowerCase().slice(0,120);
  if(field_name==='phone')field_value=raw.replace(/[^0-9+() .\-]/g,'').slice(0,26);
  if(field_name==='zip')field_value=/^\d{0,5}$/.test(raw)?raw:null;
  if(field_name==='first_name'||field_name==='last_name')
   field_value=raw.replace(/[^\p{L}\p{M}' .\-]/gu,'').slice(0,60);
 }
 return {id,event_name,target,field_name,detail,field_value,consented:consented?1:0,at};
}

export const EVENT_KEY='2026-09-12-pier-cleanup';
export const EVENT_NAME='Pompano Beach Pier Cleanup';
export const EVENT_TYPE='community-event';
export const EVENT_SOURCE='Event Table';
export const EVENT_COACH='Jonathan';
export const PRIZES=['F45 Kettlebell Keychain','1 Free Class','3 Free Classes','1 Week Unlimited','2 Weeks Unlimited','You + Friend — 3 Free Classes Each'];
const STAFF_PIN_HASH='27c07c5ddfa9e28d81ee804e4645378dccacbc94438f716f557d611f21092c5f';
const enc=new TextEncoder();

export function eventDb(env){return env?.EVENT_DB||env?.PIER_DB||null}
export function hasDb(env){const db=eventDb(env);return Boolean(db&&typeof db.prepare==='function')}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}})}
export async function ensureSchema(env){
  const db=eventDb(env);
  if(!db||typeof db.prepare!=='function')return false;
  await db.prepare(`CREATE TABLE IF NOT EXISTS event_leads (
    id TEXT PRIMARY KEY,
    event_key TEXT NOT NULL,
    event_name TEXT,
    event_type TEXT,
    lead_source TEXT,
    event_coach TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    zip TEXT NOT NULL,
    is_local INTEGER NOT NULL DEFAULT 0,
    marketing_opt_in INTEGER NOT NULL DEFAULT 0,
    event_sms_consent INTEGER NOT NULL DEFAULT 1,
    confirmation_code TEXT,
    token_nonce TEXT,
    token_expires_at INTEGER,
    confirmed_at TEXT,
    sms_message_id TEXT,
    sms_delivery_status TEXT,
    sms_error_code TEXT,
    prize TEXT,
    prize_saved_at TEXT,
    prize_text_status TEXT,
    prize_text_message_id TEXT,
    prize_text_error_code TEXT,
    metadata_json TEXT
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_event_created ON event_leads(event_key,created_at DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_token_nonce ON event_leads(token_nonce)').run();
  return true;
}
export async function insertLead(env,lead){
  if(!await ensureSchema(env))return false;
  const db=eventDb(env);
  await db.prepare(`INSERT INTO event_leads (id,event_key,event_name,event_type,lead_source,event_coach,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,confirmation_code,token_nonce,token_expires_at,sms_delivery_status,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(lead.id,EVENT_KEY,EVENT_NAME,EVENT_TYPE,EVENT_SOURCE,EVENT_COACH,lead.created_at,lead.created_at,lead.first_name,lead.last_name,lead.email,lead.phone,lead.zip,lead.is_local?1:0,lead.marketing_opt_in?1:0,1,lead.confirmation_code,lead.token_nonce,lead.token_expires_at,lead.sms_delivery_status||'pending',lead.metadata_json||null).run();
  return true;
}
export async function updateLeadSms(env,id,{message_id=null,status=null,error_code=null}={}){
  const db=eventDb(env);
  if(!db||!id)return false;
  const now=new Date().toISOString();
  await db.prepare(`UPDATE event_leads SET updated_at=?,sms_message_id=COALESCE(?,sms_message_id),sms_delivery_status=COALESCE(?,sms_delivery_status),sms_error_code=? WHERE id=?`)
    .bind(now,message_id,status,error_code,id).run();
  return true;
}
export async function markConfirmed(env,nonce){
  const db=eventDb(env);
  if(!db||!nonce)return false;
  await ensureSchema(env);
  const now=new Date().toISOString();
  await db.prepare(`UPDATE event_leads SET confirmed_at=COALESCE(confirmed_at,?),updated_at=? WHERE event_key=? AND token_nonce=?`).bind(now,now,EVENT_KEY,nonce).run();
  return true;
}
async function sha256Hex(value){const b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
function equal(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export async function staffAuthorized(request){
  const pin=request.headers.get('x-pier-staff-pin')||'';
  if(!pin)return false;
  return equal(await sha256Hex(pin),STAFF_PIN_HASH);
}

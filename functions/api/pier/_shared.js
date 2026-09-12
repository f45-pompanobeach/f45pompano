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
    metadata_json TEXT,
    notes TEXT
  )`).run();
  try{
    const cols=await db.prepare('PRAGMA table_info(event_leads)').all();
    if(!(cols.results||[]).some(c=>c.name==='notes')){
      try{await db.prepare('ALTER TABLE event_leads ADD COLUMN notes TEXT').run()}catch(e){if(!String(e?.message||e).toLowerCase().includes('duplicate column'))throw e}
    }
  }catch(e){throw e}
  await db.prepare(`CREATE TABLE IF NOT EXISTS event_settings (
    event_key TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (event_key,setting_key)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_event_created ON event_leads(event_key,created_at DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_token_nonce ON event_leads(token_nonce)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_event_phone ON event_leads(event_key,phone)').run();
  return true;
}
export async function getEventSetting(env,key,defaultValue=null){
  if(!await ensureSchema(env))return defaultValue;
  const db=eventDb(env);
  const row=await db.prepare('SELECT setting_value FROM event_settings WHERE event_key=? AND setting_key=? LIMIT 1').bind(EVENT_KEY,key).first();
  return row?row.setting_value:defaultValue;
}
export async function setEventSetting(env,key,value){
  if(!await ensureSchema(env))return false;
  const db=eventDb(env),now=new Date().toISOString();
  await db.prepare(`INSERT INTO event_settings (event_key,setting_key,setting_value,updated_at) VALUES (?,?,?,?) ON CONFLICT(event_key,setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at`).bind(EVENT_KEY,key,String(value),now).run();
  return true;
}
export async function bonusDrawingEnabled(env){return (await getEventSetting(env,'bonus_drawing_enabled','1'))!=='0'}
export async function findLeadByPhone(env,phone){
  if(!await ensureSchema(env))return null;
  const db=eventDb(env);
  return await db.prepare(`SELECT id,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,confirmed_at,prize,notes,created_at FROM event_leads WHERE event_key=? AND phone=? ORDER BY created_at ASC LIMIT 1`).bind(EVENT_KEY,phone).first();
}
export async function refreshLeadConfirmation(env,id,{confirmation_code,token_nonce,token_expires_at}={}){
  if(!await ensureSchema(env)||!id)return false;
  const db=eventDb(env),now=new Date().toISOString();
  await db.prepare(`UPDATE event_leads SET updated_at=?,confirmation_code=?,token_nonce=?,token_expires_at=?,sms_message_id=NULL,sms_delivery_status='pending_send',sms_error_code=NULL WHERE event_key=? AND id=?`)
    .bind(now,confirmation_code||null,token_nonce||null,token_expires_at||null,EVENT_KEY,id).run();
  return true;
}
export async function dedupeEventLeads(env){
  if(!await ensureSchema(env))return {groups:0,removed:0};
  const db=eventDb(env);
  const grouped=await db.prepare(`SELECT phone,LOWER(TRIM(first_name)) AS first_key,LOWER(TRIM(last_name)) AS last_key,COUNT(*) AS n FROM event_leads WHERE event_key=? GROUP BY phone,LOWER(TRIM(first_name)),LOWER(TRIM(last_name)) HAVING COUNT(*)>1`).bind(EVENT_KEY).all();
  let groups=0,removed=0;
  for(const g of grouped.results||[]){
    const q=await db.prepare(`SELECT id,created_at,updated_at,marketing_opt_in,confirmation_code,token_nonce,token_expires_at,confirmed_at,sms_message_id,sms_delivery_status,sms_error_code,prize,prize_saved_at,prize_text_status,prize_text_message_id,prize_text_error_code,notes FROM event_leads WHERE event_key=? AND phone=? AND LOWER(TRIM(first_name))=? AND LOWER(TRIM(last_name))=? ORDER BY created_at ASC`).bind(EVENT_KEY,g.phone,g.first_key,g.last_key).all();
    const rows=q.results||[];
    if(rows.length<2)continue;
    groups++;
    const canonical=rows[0],newest=rows[rows.length-1];
    const confirmations=rows.map(r=>r.confirmed_at).filter(Boolean).sort();
    const prizeRow=rows.find(r=>String(r.prize||'').trim())||canonical;
    const noteValues=[];
    for(const r of rows){const n=String(r.notes||'').trim();if(n&&!noteValues.includes(n))noteValues.push(n)}
    const mergedNotes=noteValues.join(' | ');
    const marketing=rows.some(r=>Number(r.marketing_opt_in))?1:0;
    const now=new Date().toISOString();
    await db.prepare(`UPDATE event_leads SET updated_at=?,marketing_opt_in=?,confirmation_code=?,token_nonce=?,token_expires_at=?,confirmed_at=?,sms_message_id=?,sms_delivery_status=?,sms_error_code=?,prize=?,prize_saved_at=?,prize_text_status=?,prize_text_message_id=?,prize_text_error_code=?,notes=? WHERE event_key=? AND id=?`)
      .bind(now,marketing,newest.confirmation_code||canonical.confirmation_code,newest.token_nonce||canonical.token_nonce,newest.token_expires_at||canonical.token_expires_at,confirmations[0]||null,newest.sms_message_id||canonical.sms_message_id,newest.sms_delivery_status||canonical.sms_delivery_status,newest.sms_error_code||canonical.sms_error_code,prizeRow.prize||null,prizeRow.prize_saved_at||null,prizeRow.prize_text_status||null,prizeRow.prize_text_message_id||null,prizeRow.prize_text_error_code||null,mergedNotes||null,EVENT_KEY,canonical.id).run();
    for(const r of rows.slice(1)){
      await db.prepare('DELETE FROM event_leads WHERE event_key=? AND id=?').bind(EVENT_KEY,r.id).run();
      removed++;
    }
  }
  return {groups,removed};
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

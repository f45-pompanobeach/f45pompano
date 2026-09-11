export const EVENT_KEY='2026-09-12-pier-cleanup';
export const PRIZES=['F45 Kettlebell Keychain','1 Free Class','3 Free Classes','1 Week Unlimited','2 Weeks Unlimited','You + a Friend — 1 Free Class Each','Double Grand-Prize Entry','Grand-Prize Entry — 1 Month Unlimited'];
const STAFF_PIN_HASH='b7fb400bfbf251a2bb9e9187b85762a406ef17caeb0f1c4b98dd4bdda8c46d13';
const enc=new TextEncoder();

export function hasDb(env){return Boolean(env?.PIER_DB&&typeof env.PIER_DB.prepare==='function')}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}})}
export async function ensureSchema(env){
  if(!hasDb(env))return false;
  await env.PIER_DB.exec(`CREATE TABLE IF NOT EXISTS pier_leads (
    id TEXT PRIMARY KEY,
    event_key TEXT NOT NULL,
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
    prize_text_error_code TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pier_leads_event_created ON pier_leads(event_key,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pier_leads_token_nonce ON pier_leads(token_nonce);`);
  return true;
}
export async function insertLead(env,lead){
  if(!await ensureSchema(env))return false;
  await env.PIER_DB.prepare(`INSERT INTO pier_leads (id,event_key,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,confirmation_code,token_nonce,token_expires_at,sms_delivery_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(lead.id,EVENT_KEY,lead.created_at,lead.created_at,lead.first_name,lead.last_name,lead.email,lead.phone,lead.zip,lead.is_local?1:0,lead.marketing_opt_in?1:0,1,lead.confirmation_code,lead.token_nonce,lead.token_expires_at,lead.sms_delivery_status||'pending').run();
  return true;
}
export async function updateLeadSms(env,id,{message_id=null,status=null,error_code=null}={}){
  if(!hasDb(env)||!id)return false;
  const now=new Date().toISOString();
  await env.PIER_DB.prepare(`UPDATE pier_leads SET updated_at=?,sms_message_id=COALESCE(?,sms_message_id),sms_delivery_status=COALESCE(?,sms_delivery_status),sms_error_code=? WHERE id=?`)
    .bind(now,message_id,status,error_code,id).run();
  return true;
}
export async function markConfirmed(env,nonce){
  if(!hasDb(env)||!nonce)return false;
  await ensureSchema(env);
  const now=new Date().toISOString();
  await env.PIER_DB.prepare(`UPDATE pier_leads SET confirmed_at=COALESCE(confirmed_at,?),updated_at=? WHERE event_key=? AND token_nonce=?`).bind(now,now,EVENT_KEY,nonce).run();
  return true;
}
async function sha256Hex(value){const b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
function equal(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export async function staffAuthorized(request,env){
  const pin=request.headers.get('x-pier-staff-pin')||'';
  if(!pin)return false;
  const expected=String(env?.PIER_STAFF_PIN_SHA256||STAFF_PIN_HASH).toLowerCase();
  return equal(await sha256Hex(pin),expected);
}

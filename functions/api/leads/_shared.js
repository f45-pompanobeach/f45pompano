const LEGACY_ADMIN_PIN_HASH='27c07c5ddfa9e28d81ee804e4645378dccacbc94438f716f557d611f21092c5f';
const TZ='America/New_York';
export const GENERAL_EVENT_KEY='general';
export const QR_KITS=['A','B','C','D'];
export const FOLLOWUP_STATUSES=['new','contacted','scheduled','attended','redeemed','not_interested'];
export const USER_PERMISSIONS=['trial_intake','intake_admin','table_events','table_event_admin','partner_pages','leads'];
export const LOCAL_ZIPS=new Set(['33062','33060','33064','33069','33334','33308','33309','33441']);
const enc=new TextEncoder();

export function eventDb(env){return env?.EVENT_DB||env?.PIER_DB||null}
export function hasDb(env){const db=eventDb(env);return Boolean(db&&typeof db.prepare==='function')}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}})}
export function cleanPhone(v){const d=String(v||'').replace(/\D/g,'');if(d.length===10)return `+1${d}`;if(d.length===11&&d[0]==='1')return `+${d}`;return null}
export function cleanName(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,40)}
export function cleanEmail(v){return String(v||'').trim().toLowerCase().slice(0,120)}
export function cleanZip(v){const m=String(v||'').trim().match(/^\d{5}/);return m?m[0]:null}
export function cleanKit(v){const k=String(v||'').trim().toUpperCase();return QR_KITS.includes(k)?k:null}
export function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)}
export function cleanPrizeList(v){
  const a=Array.isArray(v)?v:String(v||'').split(/\r?\n/);
  const out=[];
  for(const item of a){const s=String(item||'').trim().replace(/\s+/g,' ').slice(0,60);if(s.length>=2&&!out.includes(s))out.push(s);if(out.length>=20)break}
  return out;
}
export function eventPrizes(event){try{const a=JSON.parse(event?.prizes_json||'[]');return cleanPrizeList(a)}catch{return []}}
export function cleanFollowupStatus(v){const s=String(v||'new').trim().toLowerCase();return FOLLOWUP_STATUSES.includes(s)?s:null}
export async function sha256Hex(value){const b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))));return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
function equal(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function addColumnIfMissing(db,table,cols,name,sql){if((cols.results||[]).some(c=>c.name===name))return;try{await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${sql}`).run()}catch(e){if(!String(e?.message||e).toLowerCase().includes('duplicate column'))throw e}}

export async function ensureSchema(env){
  const db=eventDb(env);
  if(!db||typeof db.prepare!=='function')return false;
  await db.prepare(`CREATE TABLE IF NOT EXISTS event_leads (
    id TEXT PRIMARY KEY,event_key TEXT NOT NULL,event_name TEXT,event_type TEXT,lead_source TEXT,event_coach TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    first_name TEXT NOT NULL,last_name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,zip TEXT NOT NULL,is_local INTEGER NOT NULL DEFAULT 0,
    marketing_opt_in INTEGER NOT NULL DEFAULT 0,event_sms_consent INTEGER NOT NULL DEFAULT 0,confirmation_code TEXT,token_nonce TEXT,token_expires_at INTEGER,
    confirmed_at TEXT,sms_message_id TEXT,sms_delivery_status TEXT,sms_error_code TEXT,prize TEXT,prize_saved_at TEXT,prize_text_status TEXT,
    prize_text_message_id TEXT,prize_text_error_code TEXT,metadata_json TEXT,notes TEXT,followup_status TEXT NOT NULL DEFAULT 'new',followup_updated_at TEXT
  )`).run();
  const leadCols=await db.prepare('PRAGMA table_info(event_leads)').all();
  await addColumnIfMissing(db,'event_leads',leadCols,'notes','notes TEXT');
  await addColumnIfMissing(db,'event_leads',leadCols,'followup_status',"followup_status TEXT NOT NULL DEFAULT 'new'");
  await addColumnIfMissing(db,'event_leads',leadCols,'followup_updated_at','followup_updated_at TEXT');
  await addColumnIfMissing(db,'event_leads',leadCols,'tracked_elsewhere','tracked_elsewhere INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db,'event_leads',leadCols,'tracked_elsewhere_at','tracked_elsewhere_at TEXT');
  await db.prepare(`CREATE TABLE IF NOT EXISTS lead_events (
    event_key TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,event_date TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,
    staff_code_hash TEXT,qr_kit TEXT,enabled INTEGER NOT NULL DEFAULT 1,archived INTEGER NOT NULL DEFAULT 0,prize_enabled INTEGER NOT NULL DEFAULT 0,
    prizes_json TEXT,confirmation_enabled INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  )`).run();
  const eventCols=await db.prepare('PRAGMA table_info(lead_events)').all();
  await addColumnIfMissing(db,'lead_events',eventCols,'prize_enabled','prize_enabled INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db,'lead_events',eventCols,'prizes_json','prizes_json TEXT');
  await addColumnIfMissing(db,'lead_events',eventCols,'confirmation_enabled','confirmation_enabled INTEGER NOT NULL DEFAULT 0');
  await db.prepare(`CREATE TABLE IF NOT EXISTS lead_app_settings (setting_key TEXT PRIMARY KEY,setting_value TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
    user_key TEXT PRIMARY KEY,display_name TEXT NOT NULL,pin_hash TEXT,enabled INTEGER NOT NULL DEFAULT 0,
    permissions_json TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_user_sessions (
    token_hash TEXT PRIMARY KEY,user_key TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_user ON admin_user_sessions(user_key)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_handoff_tokens (
    token_hash TEXT PRIMARY KEY,user_key TEXT NOT NULL,target TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_handoff_expiry ON admin_handoff_tokens(expires_at)`).run();
  const seededNow=new Date().toISOString();
  await db.prepare(`INSERT OR IGNORE INTO admin_users(user_key,display_name,pin_hash,enabled,permissions_json,created_at,updated_at)
    VALUES('andrea','Andrea',NULL,0,?, ?, ?)`).bind(JSON.stringify(['trial_intake','intake_admin','table_events']),seededNow,seededNow).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS lead_auth_attempts (subject_hash TEXT PRIMARY KEY,fail_count INTEGER NOT NULL DEFAULT 0,window_started_at INTEGER NOT NULL,locked_until INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_event_created ON event_leads(event_key,created_at DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_event_phone ON event_leads(event_key,phone)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_leads_token_nonce ON event_leads(token_nonce)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_lead_events_staff_code ON lead_events(staff_code_hash)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_lead_events_qr_kit ON lead_events(qr_kit)').run();
  const now=new Date().toISOString();
  await db.prepare(`INSERT OR IGNORE INTO lead_events (event_key,name,slug,event_date,start_time,end_time,staff_code_hash,qr_kit,enabled,archived,prize_enabled,prizes_json,confirmation_enabled,created_at,updated_at)
    VALUES ('2026-09-12-pier-cleanup','Pompano Beach Pier Cleanup','pier-cleanup-2026-09-12','2026-09-12','00:00','23:59',NULL,NULL,0,1,1,?,1,?,?)`).bind(JSON.stringify(['F45 Kettlebell Keychain','1 Free Class','3 Free Classes','1 Week Unlimited','2 Weeks Unlimited','You + Friend — 3 Free Classes Each']),now,now).run();
  return true;
}

export async function getAdminPinHash(env){if(!await ensureSchema(env))return LEGACY_ADMIN_PIN_HASH;const row=await eventDb(env).prepare(`SELECT setting_value FROM lead_app_settings WHERE setting_key='super_admin_pin_hash' LIMIT 1`).first();return row?.setting_value||LEGACY_ADMIN_PIN_HASH}
function cookieValue(request,name){const raw=String(request.headers.get('cookie')||'');for(const part of raw.split(';')){const i=part.indexOf('=');if(i<0)continue;if(part.slice(0,i).trim()===name)return decodeURIComponent(part.slice(i+1).trim())}return ''}
export async function adminAuthorized(request,env){
  const expected=await getAdminPinHash(env);
  const code=String(request.headers.get('x-table-code')||'').trim();
  if(/^\d{4}$/.test(code)&&equal(await sha256Hex(code),expected))return true;
  const session=cookieValue(request,'f45_admin_session');
  return /^[a-f0-9]{64}$/i.test(session)&&equal(session.toLowerCase(),String(expected||'').toLowerCase());
}
export async function setAdminPin(env,newCode){if(!/^\d{4}$/.test(String(newCode||'')))throw new Error('invalid_pin');await ensureSchema(env);const db=eventDb(env),now=new Date().toISOString(),hash=await sha256Hex(newCode);await db.prepare(`INSERT INTO lead_app_settings (setting_key,setting_value,updated_at) VALUES ('super_admin_pin_hash',?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at`).bind(hash,now).run();return true}

export function cleanUserKey(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)}
export function normalizePermissions(v){
  const input=Array.isArray(v)?v:[];
  return USER_PERMISSIONS.filter(p=>input.includes(p));
}
export async function namedUserForCode(env,code){
  if(!/^\d{4}$/.test(String(code||''))||!await ensureSchema(env))return null;
  const hash=await sha256Hex(code);
  const row=await eventDb(env).prepare('SELECT user_key,display_name,enabled,permissions_json FROM admin_users WHERE pin_hash=? AND enabled=1 LIMIT 1').bind(hash).first();
  if(!row)return null;
  let permissions=[];try{permissions=normalizePermissions(JSON.parse(row.permissions_json||'[]'))}catch{}
  return {...row,permissions};
}
function randomToken(){
  const b=new Uint8Array(32);crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function createNamedUserSession(env,userKey){
  await ensureSchema(env);const db=eventDb(env),token=randomToken(),tokenHash=await sha256Hex(token),now=Math.floor(Date.now()/1000),expires=now+28800,iso=new Date().toISOString();
  await db.prepare('DELETE FROM admin_user_sessions WHERE expires_at<?').bind(now).run();
  await db.prepare('INSERT INTO admin_user_sessions(token_hash,user_key,expires_at,created_at) VALUES(?,?,?,?)').bind(tokenHash,userKey,expires,iso).run();
  return {token,expires};
}
export async function namedUserFromRequest(request,env){
  if(!await ensureSchema(env))return null;
  const token=cookieValue(request,'f45_user_session');if(!token)return null;
  const hash=await sha256Hex(token),now=Math.floor(Date.now()/1000);
  const row=await eventDb(env).prepare(`SELECT u.user_key,u.display_name,u.enabled,u.permissions_json,s.expires_at
    FROM admin_user_sessions s JOIN admin_users u ON u.user_key=s.user_key
    WHERE s.token_hash=? AND s.expires_at>? AND u.enabled=1 LIMIT 1`).bind(hash,now).first();
  if(!row)return null;
  let permissions=[];try{permissions=normalizePermissions(JSON.parse(row.permissions_json||'[]'))}catch{}
  return {user_key:row.user_key,display_name:row.display_name,permissions};
}
export async function deleteNamedUserSession(request,env){
  if(!await ensureSchema(env))return;
  const token=cookieValue(request,'f45_user_session');if(!token)return;
  await eventDb(env).prepare('DELETE FROM admin_user_sessions WHERE token_hash=?').bind(await sha256Hex(token)).run();
}
export async function listAdminUsers(env){
  await ensureSchema(env);const rows=await eventDb(env).prepare('SELECT user_key,display_name,enabled,permissions_json,pin_hash IS NOT NULL AS has_pin,created_at,updated_at FROM admin_users ORDER BY display_name').all();
  return (rows.results||[]).map(r=>{let permissions=[];try{permissions=normalizePermissions(JSON.parse(r.permissions_json||'[]'))}catch{}return {...r,enabled:Boolean(r.enabled),has_pin:Boolean(r.has_pin),permissions}});
}
export async function saveAdminUser(env,{userKey,displayName,pin=null,enabled=false,permissions=[]}){
  await ensureSchema(env);const db=eventDb(env),key=cleanUserKey(userKey||displayName),name=String(displayName||'').trim().replace(/\s+/g,' ').slice(0,60),perms=normalizePermissions(permissions),now=new Date().toISOString();
  if(!key||!name)throw new Error('invalid_user');
  let pinHash=null;
  if(pin!==null&&pin!==''){
    if(!/^\d{4}$/.test(String(pin)))throw new Error('invalid_pin');
    pinHash=await sha256Hex(String(pin));
    const superHash=await getAdminPinHash(env);if(equal(pinHash,superHash))throw new Error('pin_in_use');
    const event=await db.prepare('SELECT event_key FROM lead_events WHERE staff_code_hash=? LIMIT 1').bind(pinHash).first();if(event)throw new Error('pin_in_use');
    const other=await db.prepare('SELECT user_key FROM admin_users WHERE pin_hash=? AND user_key<>? LIMIT 1').bind(pinHash,key).first();if(other)throw new Error('pin_in_use');
  }
  const current=await db.prepare('SELECT user_key,pin_hash FROM admin_users WHERE user_key=? LIMIT 1').bind(key).first();
  if(current){
    const finalHash=pinHash||current.pin_hash||null;
    if(enabled&&!finalHash)throw new Error('pin_required');
    await db.prepare('UPDATE admin_users SET display_name=?,pin_hash=?,enabled=?,permissions_json=?,updated_at=? WHERE user_key=?').bind(name,finalHash,enabled?1:0,JSON.stringify(perms),now,key).run();
    if(!enabled)await db.prepare('DELETE FROM admin_user_sessions WHERE user_key=?').bind(key).run();
  }else{
    if(enabled&&!pinHash)throw new Error('pin_required');
    await db.prepare('INSERT INTO admin_users(user_key,display_name,pin_hash,enabled,permissions_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(key,name,pinHash,enabled?1:0,JSON.stringify(perms),now,now).run();
  }
  return true;
}

async function eventForStaffHash(env,hash){
  if(!/^[a-f0-9]{64}$/i.test(String(hash||''))||!await ensureSchema(env))return null;
  return eventDb(env).prepare(`SELECT event_key,name,slug,event_date,start_time,end_time,qr_kit,enabled,archived,prize_enabled,prizes_json,confirmation_enabled FROM lead_events WHERE staff_code_hash=? AND archived=0 AND enabled=1 ORDER BY event_date DESC LIMIT 1`).bind(String(hash).toLowerCase()).first();
}
export async function eventForStaffCode(env,code){
  if(!/^\d{4}$/.test(String(code||''))||!await ensureSchema(env))return null;
  return eventForStaffHash(env,await sha256Hex(code));
}
export async function staffEventFromRequest(request,env){
  const code=String(request.headers.get('x-table-code')||'').trim();
  if(/^\d{4}$/.test(code)){
    const event=await eventForStaffCode(env,code);
    if(event)return event;
  }
  return eventForStaffHash(env,cookieValue(request,'f45_event_session'));
}

function floridaParts(date=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);const o={};for(const p of parts)if(p.type!=='literal')o[p.type]=p.value;return {date:`${o.year}-${o.month}-${o.day}`,time:`${o.hour}:${o.minute}`}}
function mins(t){const m=String(t||'').match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null}
export function eventWindowIsActive(event,now=new Date()){if(!event||Number(event.archived)||!Number(event.enabled))return false;const p=floridaParts(now);if(p.date!==event.event_date)return false;const n=mins(p.time),s=mins(event.start_time),e=mins(event.end_time);if(n===null||s===null||e===null)return false;return n>=Math.max(0,s-60)&&n<=Math.min(1439,e+60)}
export async function resolveLeadEvent(env,{kit=null,eventSlug=null}={}){
  if(!await ensureSchema(env))return {event_key:GENERAL_EVENT_KEY,name:'General Leads',slug:null,source:'General Lead Form',confirmation_enabled:0};
  const db=eventDb(env),slug=cleanSlug(eventSlug);
  if(slug){const event=await db.prepare(`SELECT event_key,name,slug,event_date,start_time,end_time,qr_kit,enabled,archived,prize_enabled,prizes_json,confirmation_enabled FROM lead_events WHERE slug=? AND archived=0 AND enabled=1 LIMIT 1`).bind(slug).first();if(event)return {...event,source:'Event Link'}}
  const k=cleanKit(kit);
  if(k){const event=await db.prepare(`SELECT event_key,name,slug,event_date,start_time,end_time,qr_kit,enabled,archived,prize_enabled,prizes_json,confirmation_enabled FROM lead_events WHERE qr_kit=? AND archived=0 AND enabled=1 ORDER BY event_date DESC LIMIT 1`).bind(k).first();if(event&&eventWindowIsActive(event))return {...event,source:`Event QR Kit ${k}`}}
  return {event_key:GENERAL_EVENT_KEY,name:'General Leads',slug:null,source:k?`Event QR Kit ${k} - Outside Event Window`:'General Lead Form',confirmation_enabled:0};
}

export async function findLeadByPhone(env,eventKey,phone){if(!await ensureSchema(env))return null;return eventDb(env).prepare(`SELECT * FROM event_leads WHERE event_key=? AND phone=? ORDER BY created_at ASC LIMIT 1`).bind(eventKey,phone).first()}
export async function saveLead(env,{event,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,contact_consent}){
  await ensureSchema(env);const db=eventDb(env),now=new Date().toISOString(),existing=await findLeadByPhone(env,event.event_key,phone);
  if(existing){await db.prepare(`UPDATE event_leads SET updated_at=?,first_name=?,last_name=?,email=?,zip=?,is_local=?,marketing_opt_in=CASE WHEN marketing_opt_in=1 OR ?=1 THEN 1 ELSE 0 END,event_sms_consent=CASE WHEN event_sms_consent=1 OR ?=1 THEN 1 ELSE 0 END,event_name=?,lead_source=? WHERE id=?`).bind(now,first_name,last_name,email,zip,is_local?1:0,marketing_opt_in?1:0,contact_consent?1:0,event.name,event.source,existing.id).run();return {id:existing.id,duplicate:true,created_at:existing.created_at,existing}}
  const id=crypto.randomUUID();await db.prepare(`INSERT INTO event_leads (id,event_key,event_name,event_type,lead_source,event_coach,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,metadata_json,followup_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,event.event_key,event.name,event.event_key===GENERAL_EVENT_KEY?'general':'community-event',event.source,null,now,now,first_name,last_name,email,phone,zip,is_local?1:0,marketing_opt_in?1:0,contact_consent?1:0,JSON.stringify({form:'table-leads-v3',event_slug:event.slug||null,qr_kit:event.qr_kit||null}),'new').run();return {id,duplicate:false,created_at:now,existing:null};
}
export async function setLeadConfirmationToken(env,{id,eventKey,code,nonce,expiresAt,messageId=null,deliveryStatus=null,errorCode=null}){await ensureSchema(env);const now=new Date().toISOString();await eventDb(env).prepare(`UPDATE event_leads SET updated_at=?,confirmation_code=?,token_nonce=?,token_expires_at=?,sms_message_id=?,sms_delivery_status=?,sms_error_code=? WHERE id=? AND event_key=?`).bind(now,code||null,nonce||null,expiresAt||null,messageId,deliveryStatus,errorCode,id,eventKey).run()}
export async function updateLeadSms(env,{id,eventKey,messageId=null,status=null,errorCode=null}){await ensureSchema(env);const now=new Date().toISOString();await eventDb(env).prepare(`UPDATE event_leads SET updated_at=?,sms_message_id=COALESCE(?,sms_message_id),sms_delivery_status=COALESCE(?,sms_delivery_status),sms_error_code=? WHERE id=? AND event_key=?`).bind(now,messageId,status,errorCode,id,eventKey).run()}
export async function markLeadConfirmed(env,{id,eventKey,nonce}){if(!id||!eventKey||!nonce)return false;await ensureSchema(env);const now=new Date().toISOString();const r=await eventDb(env).prepare(`UPDATE event_leads SET confirmed_at=COALESCE(confirmed_at,?),updated_at=? WHERE id=? AND event_key=? AND token_nonce=?`).bind(now,now,id,eventKey,nonce).run();return Number(r?.meta?.changes||0)>0}
export async function updateLeadFollowupStatus(env,{id,eventKey,status}){const clean=cleanFollowupStatus(status);if(!clean)throw new Error('invalid_status');await ensureSchema(env);const now=new Date().toISOString();const r=await eventDb(env).prepare(`UPDATE event_leads SET followup_status=?,followup_updated_at=?,updated_at=? WHERE id=? AND event_key=?`).bind(clean,now,now,id,eventKey).run();return Number(r?.meta?.changes||0)>0}

function clientId(request){return String(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,80)}
async function authSubject(request){return sha256Hex(`tableleads-auth:${clientId(request)}`)}
export async function authThrottle(env,request){if(!await ensureSchema(env))return {blocked:false,retry_after:0};const db=eventDb(env),subject=await authSubject(request),now=Math.floor(Date.now()/1000),row=await db.prepare('SELECT fail_count,window_started_at,locked_until FROM lead_auth_attempts WHERE subject_hash=? LIMIT 1').bind(subject).first();if(row&&Number(row.locked_until)>now)return {blocked:true,retry_after:Number(row.locked_until)-now,subject};return {blocked:false,retry_after:0,subject}}
export async function recordAuthFailure(env,request){if(!await ensureSchema(env))return;const db=eventDb(env),subject=await authSubject(request),now=Math.floor(Date.now()/1000),iso=new Date().toISOString(),row=await db.prepare('SELECT fail_count,window_started_at FROM lead_auth_attempts WHERE subject_hash=? LIMIT 1').bind(subject).first();let count=1,start=now;if(row&&now-Number(row.window_started_at)<=600){count=Number(row.fail_count||0)+1;start=Number(row.window_started_at)}const locked=count>=5?now+900:0;await db.prepare(`INSERT INTO lead_auth_attempts(subject_hash,fail_count,window_started_at,locked_until,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(subject_hash) DO UPDATE SET fail_count=excluded.fail_count,window_started_at=excluded.window_started_at,locked_until=excluded.locked_until,updated_at=excluded.updated_at`).bind(subject,count,start,locked,iso).run();return {count,locked_until:locked}}
export async function recordAuthSuccess(env,request){if(!await ensureSchema(env))return;const subject=await authSubject(request);await eventDb(env).prepare('DELETE FROM lead_auth_attempts WHERE subject_hash=?').bind(subject).run()}


export function normalizeEventPresentation(value={}){
  const cleanText=(v,n)=>String(v??'').trim().replace(/\r\n/g,'\n').slice(0,n);
  return {
    public_headline:cleanText(value.public_headline,80),
    show_event_name:value.show_event_name===true||value.show_event_name===1,
    info_title:cleanText(value.info_title,80),
    info_body:cleanText(value.info_body,500),
    confirmation_message:cleanText(value.confirmation_message,280),
    show_schedule:value.show_schedule!==false&&value.show_schedule!==0,
    show_expect:value.show_expect!==false&&value.show_expect!==0,
    show_reviews:value.show_reviews!==false&&value.show_reviews!==0
  };
}
export async function getEventPresentation(env,eventKey){
  if(!eventKey||!await ensureSchema(env))return normalizeEventPresentation();
  const row=await eventDb(env).prepare('SELECT setting_value FROM lead_app_settings WHERE setting_key=? LIMIT 1').bind(`event_presentation:${eventKey}`).first();
  if(!row?.setting_value)return normalizeEventPresentation();
  try{return normalizeEventPresentation(JSON.parse(row.setting_value))}catch{return normalizeEventPresentation()}
}
export async function setEventPresentation(env,eventKey,value){
  await ensureSchema(env);
  const normalized=normalizeEventPresentation(value),now=new Date().toISOString();
  await eventDb(env).prepare(`INSERT INTO lead_app_settings(setting_key,setting_value,updated_at) VALUES(?,?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at`).bind(`event_presentation:${eventKey}`,JSON.stringify(normalized),now).run();
  return normalized;
}

export async function createUniqueSlug(db,name,date){const base=cleanSlug(`${name}-${date}`)||`event-${date}`;let slug=base;for(let i=0;i<20;i++){const row=await db.prepare('SELECT event_key FROM lead_events WHERE slug=? LIMIT 1').bind(slug).first();if(!row)return slug;slug=`${base}-${String(Math.floor(1000+Math.random()*9000))}`}return `${base}-${crypto.randomUUID().slice(0,8)}`}

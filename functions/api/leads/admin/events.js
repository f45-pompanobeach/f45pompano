import {QR_KITS,adminAuthorized,cleanKit,cleanPrizeList,createUniqueSlug,ensureSchema,eventDb,getAdminPinHash,getEventPresentation,json,setEventPresentation,sha256Hex} from '../_shared.js';

function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function validTime(v){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(v||''))}
function min(t){const [h,m]=t.split(':').map(Number);return h*60+m}
function cleanName(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,80)}
async function codeAvailable(env,code,excludeKey=null){const db=eventDb(env),hash=await sha256Hex(code),adminHash=await getAdminPinHash(env);if(hash===adminHash)return false;const user=await db.prepare('SELECT user_key FROM admin_users WHERE pin_hash=? AND enabled=1 LIMIT 1').bind(hash).first();if(user)return false;const row=await db.prepare(`SELECT event_key FROM lead_events WHERE staff_code_hash=? AND archived=0 ${excludeKey?'AND event_key<>?':''} LIMIT 1`).bind(...(excludeKey?[hash,excludeKey]:[hash])).first();return !row}

export async function onRequestGet({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  const db=eventDb(env);
  const q=await db.prepare(`SELECT e.event_key,e.name,e.slug,e.event_date,e.start_time,e.end_time,e.qr_kit,e.enabled,e.archived,e.prize_enabled,e.prizes_json,e.confirmation_enabled,e.created_at,e.updated_at,
    (SELECT COUNT(*) FROM event_leads l WHERE l.event_key=e.event_key) AS lead_count,
    CASE WHEN e.staff_code_hash IS NULL THEN 0 ELSE 1 END AS code_set
    FROM lead_events e ORDER BY e.event_date DESC,e.start_time DESC`).all();
  const general=await db.prepare(`SELECT COUNT(*) AS n FROM event_leads WHERE event_key='general'`).first();
  const events=[];for(const event of (q.results||[]))events.push({...event,presentation:await getEventPresentation(env,event.event_key)});
  return json({ok:true,events,general_lead_count:Number(general?.n||0),qr_kits:QR_KITS});
}

export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const db=eventDb(env),action=String(body.action||'create');
  if(action==='create'){
    const name=cleanName(body.name),date=String(body.event_date||''),start=String(body.start_time||''),end=String(body.end_time||''),code=String(body.staff_code||''),kit=cleanKit(body.qr_kit);
    const prizeEnabled=body.prize_enabled===true||body.prize_enabled===1,prizes=cleanPrizeList(body.prizes||[]),confirmationEnabled=body.confirmation_enabled===true||body.confirmation_enabled===1;
    if(name.length<2||!validDate(date)||!validTime(start)||!validTime(end)||min(start)>=min(end)||!/^\d{4}$/.test(code))return json({ok:false,error:'invalid_event',message:'Enter an event name, date, valid start/end times, and a 4-digit event code.'},400);
    if(!await codeAvailable(env,code))return json({ok:false,error:'code_in_use',message:'That 4-digit code is already in use or matches an Admin PIN.'},409);
    const eventKey=`evt_${crypto.randomUUID()}`,slug=await createUniqueSlug(db,name,date),now=new Date().toISOString(),hash=await sha256Hex(code);
    if(kit)await db.prepare('UPDATE lead_events SET qr_kit=NULL,updated_at=? WHERE qr_kit=? AND archived=0').bind(now,kit).run();
    await db.prepare(`INSERT INTO lead_events (event_key,name,slug,event_date,start_time,end_time,staff_code_hash,qr_kit,enabled,archived,prize_enabled,prizes_json,confirmation_enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,0,?,?,?,?,?)`)
      .bind(eventKey,name,slug,date,start,end,hash,kit,prizeEnabled?1:0,JSON.stringify(prizes),confirmationEnabled?1:0,now,now).run();
    const presentation=await setEventPresentation(env,eventKey,body.presentation||{});
    return json({ok:true,event:{event_key:eventKey,name,slug,event_date:date,start_time:start,end_time:end,qr_kit:kit,staff_code:code,prize_enabled:prizeEnabled,prizes,confirmation_enabled:confirmationEnabled,presentation}});
  }
  const eventKey=String(body.event_key||'').trim();if(!eventKey)return json({ok:false,error:'missing_event'},400);
  const existing=await db.prepare('SELECT * FROM lead_events WHERE event_key=? LIMIT 1').bind(eventKey).first();if(!existing)return json({ok:false,error:'not_found'},404);
  if(existing.event_key==='2026-09-12-pier-cleanup'&&action!=='unarchive'){if(action==='archive')return json({ok:true,unchanged:true})}
  const now=new Date().toISOString();
  if(action==='update'){
    const name=cleanName(body.name??existing.name),date=String(body.event_date??existing.event_date),start=String(body.start_time??existing.start_time),end=String(body.end_time??existing.end_time);
    const kit=body.qr_kit===undefined?existing.qr_kit:(body.qr_kit===null||body.qr_kit===''?null:cleanKit(body.qr_kit));
    const confirmationEnabled=body.confirmation_enabled===undefined?Boolean(Number(existing.confirmation_enabled)):(body.confirmation_enabled===true||body.confirmation_enabled===1);
    if(name.length<2||!validDate(date)||!validTime(start)||!validTime(end)||min(start)>=min(end))return json({ok:false,error:'invalid_event',message:'Check the event name, date, and times.'},400);
    if(kit)await db.prepare('UPDATE lead_events SET qr_kit=NULL,updated_at=? WHERE qr_kit=? AND event_key<>? AND archived=0').bind(now,kit,eventKey).run();
    await db.prepare('UPDATE lead_events SET name=?,event_date=?,start_time=?,end_time=?,qr_kit=?,confirmation_enabled=?,updated_at=? WHERE event_key=?').bind(name,date,start,end,kit,confirmationEnabled?1:0,now,eventKey).run();
    const presentation=body.presentation===undefined?await getEventPresentation(env,eventKey):await setEventPresentation(env,eventKey,body.presentation);
    return json({ok:true,confirmation_enabled:confirmationEnabled,presentation});
  }
  if(action==='update_prizes'){
    const enabled=body.prize_enabled===true||body.prize_enabled===1,prizes=cleanPrizeList(body.prizes||[]);
    await db.prepare('UPDATE lead_events SET prize_enabled=?,prizes_json=?,updated_at=? WHERE event_key=?').bind(enabled?1:0,JSON.stringify(prizes),now,eventKey).run();
    return json({ok:true,prize_enabled:enabled,prizes});
  }
  if(action==='reset_code'){
    const code=String(body.staff_code||'');if(!/^\d{4}$/.test(code))return json({ok:false,error:'invalid_code',message:'Enter a 4-digit event code.'},400);
    if(!await codeAvailable(env,code,eventKey))return json({ok:false,error:'code_in_use',message:'That code is already in use or matches an Admin PIN.'},409);
    await db.prepare('UPDATE lead_events SET staff_code_hash=?,updated_at=? WHERE event_key=?').bind(await sha256Hex(code),now,eventKey).run();return json({ok:true,staff_code:code});
  }
  if(action==='archive'){await db.prepare('UPDATE lead_events SET archived=1,enabled=0,qr_kit=NULL,updated_at=? WHERE event_key=?').bind(now,eventKey).run();return json({ok:true})}
  if(action==='unarchive'){await db.prepare('UPDATE lead_events SET archived=0,enabled=1,updated_at=? WHERE event_key=?').bind(now,eventKey).run();return json({ok:true})}
  return json({ok:false,error:'invalid_action'},400);
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

import {LOCAL_ZIPS,cleanEmail,cleanName,cleanPhone,cleanSlug,cleanZip,ensureSchema,eventDb,json} from './_shared.js';

export async function onRequestPost({request,env}){
  let d={};try{d=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  if(String(d.website||'').trim())return json({ok:true});
  const firstName=cleanName(d.first_name),lastName=cleanName(d.last_name),email=cleanEmail(d.email),phone=cleanPhone(d.phone),zip=cleanZip(d.zip)||'';
  if(firstName.length<2||lastName.length<2||!/^\\S+@\\S+\\.\\S+$/.test(email)||!phone||!zip)return json({ok:false,error:'invalid_fields'},400);
  if(!await ensureSchema(env))return json({ok:false,error:'db_unavailable'},503);
  const type=String(d.source_type||'website').trim().toLowerCase()==='partner'?'partner-page':'website';
  const slug=cleanSlug(d.source_slug||d.source_name||'root')||'root';
  const eventKey=type==='partner-page'?'landing:'+slug:'website:root';
  const eventName=String(d.source_name||(type==='partner-page'?'Partner Page':'Main Website')).trim().slice(0,120);
  const leadSource=type==='partner-page'?'Partner Page - '+eventName:'Main Website';
  const db=eventDb(env),now=new Date().toISOString();
  const existing=await db.prepare('SELECT id FROM event_leads WHERE event_key=? AND phone=? ORDER BY created_at ASC LIMIT 1').bind(eventKey,phone).first();
  if(existing){
    await db.prepare('UPDATE event_leads SET updated_at=?,first_name=?,last_name=?,email=?,zip=?,is_local=?,marketing_opt_in=CASE WHEN marketing_opt_in=1 OR ?=1 THEN 1 ELSE 0 END,event_name=?,lead_source=? WHERE id=?')
      .bind(now,firstName,lastName,email,zip,LOCAL_ZIPS.has(zip)?1:0,d.marketing_opt_in===true?1:0,eventName,leadSource,existing.id).run();
    return json({ok:true,id:existing.id,duplicate:true});
  }
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO event_leads (id,event_key,event_name,event_type,lead_source,event_coach,created_at,updated_at,first_name,last_name,email,phone,zip,is_local,marketing_opt_in,event_sms_consent,metadata_json,followup_status,tracked_elsewhere) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)')
    .bind(id,eventKey,eventName,type,leadSource,null,now,now,firstName,lastName,email,phone,zip,LOCAL_ZIPS.has(zip)?1:0,d.marketing_opt_in===true?1:0,0,JSON.stringify({source_slug:slug,source_url:String(d.source_url||'').slice(0,500),offer:String(d.offer||'').slice(0,160)}),'new').run();
  return json({ok:true,id,duplicate:false});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

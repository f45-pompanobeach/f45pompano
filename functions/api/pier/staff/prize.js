import {EVENT_KEY,PRIZES,ensureSchema,hasDb,json,staffAuthorized} from '../_shared.js';

function smsState(data){
  const status=String(data?.to?.[0]?.status||data?.status||'').toLowerCase();
  const errors=Array.isArray(data?.errors)?data.errors:[];
  const error=errors[0]||null;
  return {status:status||'accepted',error_code:error?.code||null};
}
async function emailPrize(lead,prize,at){
  const body=new URLSearchParams({_subject:`PIER PRIZE - ${lead.first_name} ${lead.last_name} - ${prize}`,_template:'table',_captcha:'false','Event':'Pompano Beach Pier Cleanup - 2026-09-12','Name':`${lead.first_name} ${lead.last_name}`,'Phone':lead.phone,'Email':lead.email,'ZIP':lead.zip,'Local ZIP':lead.is_local?'Yes':'No','Prize':prize,'Recorded At':at});
  return fetch('https://formsubmit.co/ajax/pompanobeach@f45training.com',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString()});
}
async function sendPrizeText(env,lead,prize,correction){
  if(!env.TELNYX_API_KEY)return {status:'not_configured',message_id:null,error_code:null};
  const prefix=correction?'Correction — your event prize is':'Prize saved —';
  const text=`F45 Pompano: ${prefix} ${prize}. We'll follow up with redemption details. Questions: 954-302-3889. Reply STOP to opt out.`;
  try{
    const r=await fetch('https://api.telnyx.com/v2/messages',{method:'POST',headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({from:env.TELNYX_FROM_NUMBER||'+17543463010',to:lead.phone,text})});
    let j={};try{j=await r.json()}catch{}
    if(!r.ok)return {status:'rejected',message_id:null,error_code:j?.errors?.[0]?.code||null};
    const s=smsState(j?.data);
    return {status:s.status,message_id:j?.data?.id||null,error_code:s.error_code};
  }catch{return {status:'send_error',message_id:null,error_code:null}}
}

export async function onRequestPost(context){
  const {request,env}=context;
  if(!await staffAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!hasDb(env))return json({ok:false,error:'d1_not_configured',message:'Shared lead storage is not configured yet.'},503);
  let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const id=String(body.id||'').trim(),prize=String(body.prize||'').trim();
  if(!id||!PRIZES.includes(prize))return json({ok:false,error:'invalid_prize'},400);
  try{
    await ensureSchema(env);
    const lead=await env.PIER_DB.prepare(`SELECT * FROM pier_leads WHERE id=? AND event_key=? LIMIT 1`).bind(id,EVENT_KEY).first();
    if(!lead)return json({ok:false,error:'lead_not_found'},404);
    if(lead.prize===prize)return json({ok:true,unchanged:true,lead_id:id,prize,prize_text_status:lead.prize_text_status||null});
    const now=new Date().toISOString(),correction=Boolean(lead.prize);
    await env.PIER_DB.prepare(`UPDATE pier_leads SET prize=?,prize_saved_at=?,updated_at=? WHERE id=?`).bind(prize,now,now,id).run();
    let receipt={status:'not_needed',message_id:null,error_code:null};
    if(prize!=='F45 Kettlebell Keychain'&&lead.event_sms_consent){
      receipt=await sendPrizeText(env,lead,prize,correction);
      await env.PIER_DB.prepare(`UPDATE pier_leads SET prize_text_status=?,prize_text_message_id=?,prize_text_error_code=?,updated_at=? WHERE id=?`).bind(receipt.status,receipt.message_id,receipt.error_code,new Date().toISOString(),id).run();
    }
    context.waitUntil(emailPrize(lead,prize,now).catch(()=>{}));
    return json({ok:true,lead_id:id,prize,correction,prize_text_status:receipt.status,prize_text_message_id:receipt.message_id,prize_text_error_code:receipt.error_code});
  }catch(e){return json({ok:false,error:'save_failed',message:'Could not save this prize.'},500)}
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

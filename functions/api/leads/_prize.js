import {cleanPrizeList,ensureSchema,eventDb,eventPrizes,json} from './_shared.js';

function smsSafe(v){return String(v||'').replace(/[–—]/g,'-').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').normalize('NFKD').replace(/[^\x20-\x7E]/g,'').trim()}
async function sendPrizeText(env,lead,eventName,prize,correction){
  if(!env.TELNYX_API_KEY||!lead.event_sms_consent)return {status:'not_sent',message_id:null,error_code:null};
  const prefix=correction?'Correction: ':'';
  const text=`F45 Pompano: ${prefix}You received ${smsSafe(prize)} at ${smsSafe(eventName)}. We'll follow up with details. Questions? Call/text 954-302-3889. Reply STOP to opt out.`;
  try{
    const r=await fetch('https://api.telnyx.com/v2/messages',{method:'POST',headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({from:env.TELNYX_FROM_NUMBER||'+17543463010',to:lead.phone,text})});
    let j={};try{j=await r.json()}catch{}
    if(!r.ok)return {status:'rejected',message_id:null,error_code:j?.errors?.[0]?.code||null};
    return {status:String(j?.data?.to?.[0]?.status||'accepted').toLowerCase(),message_id:j?.data?.id||null,error_code:j?.data?.errors?.[0]?.code||null};
  }catch{return {status:'send_error',message_id:null,error_code:null}}
}

export async function savePrizeForEvent(env,event,id,rawPrize,{custom=false}={}){
  if(!event||!Number(event.prize_enabled))return {response:json({ok:false,error:'prizes_disabled',message:'Prize selection is not enabled for this event.'},400)};
  if(!await ensureSchema(env))return {response:json({ok:false,error:'db_unavailable'},503)};
  const db=eventDb(env),lead=await db.prepare('SELECT * FROM event_leads WHERE id=? AND event_key=? LIMIT 1').bind(id,event.event_key).first();
  if(!lead)return {response:json({ok:false,error:'lead_not_found'},404)};
  const clear=rawPrize===null||rawPrize===''||rawPrize==='__NONE__';
  const prize=clear?null:String(rawPrize||'').trim().replace(/\s+/g,' ').slice(0,60);
  const configured=eventPrizes(event);
  if(!clear){const validCustom=custom&&prize.length>=2&&prize.length<=60&&!/[\r\n]/.test(prize);if(!configured.includes(prize)&&!validCustom)return {response:json({ok:false,error:'invalid_prize',message:'Choose a configured prize or enter a write-in prize.'},400)}}
  if((lead.prize||null)===(prize||null))return {response:json({ok:true,unchanged:true,lead_id:id,prize:prize||null,prize_text_status:lead.prize_text_status||null})};
  const now=new Date().toISOString();
  if(clear){await db.prepare(`UPDATE event_leads SET prize=NULL,prize_saved_at=NULL,prize_text_status=NULL,prize_text_message_id=NULL,prize_text_error_code=NULL,updated_at=? WHERE id=? AND event_key=?`).bind(now,id,event.event_key).run();return {response:json({ok:true,reset:true,lead_id:id,prize:null})}}
  const correction=Boolean(lead.prize);
  await db.prepare('UPDATE event_leads SET prize=?,prize_saved_at=?,updated_at=? WHERE id=? AND event_key=?').bind(prize,now,now,id,event.event_key).run();
  const receipt=await sendPrizeText(env,lead,event.name,prize,correction);
  await db.prepare('UPDATE event_leads SET prize_text_status=?,prize_text_message_id=?,prize_text_error_code=?,updated_at=? WHERE id=? AND event_key=?').bind(receipt.status,receipt.message_id,receipt.error_code,new Date().toISOString(),id,event.event_key).run();
  return {response:json({ok:true,lead_id:id,prize,correction,prize_text_status:receipt.status})};
}

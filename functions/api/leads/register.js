import {LOCAL_ZIPS,cleanEmail,cleanName,cleanPhone,cleanZip,json,resolveLeadEvent,saveLead,setLeadConfirmationToken,updateLeadSms} from './_shared.js';

const enc=new TextEncoder();
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function b64text(s){return b64(enc.encode(s))}
function nonce(){const a=new Uint8Array(12);crypto.getRandomValues(a);return b64(a)}
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)));return b64(sig.slice(0,18))}
async function makeToken(payload,secret){const body=b64text(JSON.stringify(payload));return `${body}.${await sign(body,secret)}`}
function smsState(data){const status=String(data?.to?.[0]?.status||'').toLowerCase(),error=Array.isArray(data?.errors)?data.errors[0]:null;return {status,error_code:error?.code||null}}
async function emailLead(lead){
  const body=new URLSearchParams({_subject:`TABLE LEAD - ${lead.event_name} - ${lead.first_name} ${lead.last_name}`,_template:'table',_captcha:'false','Lead Source':lead.event_name,'First Name':lead.first_name,'Last Name':lead.last_name,Email:lead.email,Phone:lead.phone,ZIP:lead.zip,'Local ZIP':lead.is_local?'Yes':'No','Marketing SMS Opt-In':lead.marketing_opt_in?'Yes':'No','Submitted At':lead.submitted_at});
  return fetch('https://formsubmit.co/ajax/pompanobeach@f45training.com',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString()});
}

export async function onRequestPost(context){
  const {request,env}=context;
  let d={};try{d=await request.json()}catch{return json({ok:false,error:'invalid_request',message:'Invalid request.'},400)}
  if(String(d.website||'').trim())return json({ok:true});
  const firstName=cleanName(d.first_name),lastName=cleanName(d.last_name),email=cleanEmail(d.email),phone=cleanPhone(d.phone),zip=cleanZip(d.zip);
  if(firstName.length<2||lastName.length<2)return json({ok:false,message:'Please enter your first and last name.'},400);
  if(!/^\S+@\S+\.\S+$/.test(email))return json({ok:false,message:'Please enter a valid email address.'},400);
  if(!phone)return json({ok:false,message:'Please enter a valid U.S. mobile number.'},400);
  if(!zip)return json({ok:false,message:'Please enter a valid 5-digit ZIP code.'},400);
  if(d.contact_consent!==true||d.terms_accepted!==true)return json({ok:false,message:'Please accept the required contact consent and terms.'},400);
  try{
    const event=await resolveLeadEvent(env,{kit:d.kit,eventSlug:d.event});
    const confirmationRequired=Boolean(Number(event.confirmation_enabled));
    if(confirmationRequired&&!env.TELNYX_API_KEY)return json({ok:false,error:'sms_not_configured',message:'Confirmation texting is temporarily unavailable. Please ask the F45 team for help.'},503);
    const saved=await saveLead(env,{event,first_name:firstName,last_name:lastName,email,phone,zip,is_local:LOCAL_ZIPS.has(zip),marketing_opt_in:d.marketing_opt_in===true,contact_consent:true});
    if(!saved.duplicate){context.waitUntil(emailLead({event_name:event.name,first_name:firstName,last_name:lastName,email,phone,zip,is_local:LOCAL_ZIPS.has(zip),marketing_opt_in:d.marketing_opt_in===true,submitted_at:saved.created_at}).catch(()=>{}))}
    if(!confirmationRequired)return json({ok:true,lead_id:saved.id,duplicate:saved.duplicate,event_key:event.event_key,event_name:event.name,confirmation_required:false});

    const secret=env.TABLE_LEADS_TOKEN_SECRET||env.PIER_TOKEN_SECRET||env.TELNYX_API_KEY;
    const tokenNonce=nonce(),expiresAt=Math.floor(Date.now()/1000)+1200,confirmationCode=tokenNonce.slice(-6).toUpperCase();
    const token=await makeToken({id:saved.id,event_key:event.event_key,nonce:tokenNonce,exp:expiresAt,name:firstName.slice(0,24)},secret);
    await setLeadConfirmationToken(env,{id:saved.id,eventKey:event.event_key,code:confirmationCode,nonce:tokenNonce,expiresAt,deliveryStatus:'pending_send'});
    const confirmUrl=`https://f45pompano.com/tableleads/confirm?t=${encodeURIComponent(token)}`;
    const text=`F45 Pompano: Confirm your entry for ${event.name}: ${confirmUrl} Reply STOP to opt out.`;
    let r;try{r=await fetch('https://api.telnyx.com/v2/messages',{method:'POST',headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({from:env.TELNYX_FROM_NUMBER||'+17543463010',to:phone,text})})}catch{await updateLeadSms(env,{id:saved.id,eventKey:event.event_key,status:'send_error'});return json({ok:false,error:'sms_send_failed',message:'We saved your information, but could not send the confirmation text. Please ask the F45 team for help.'},502)}
    let sendJson={};try{sendJson=await r.json()}catch{}
    const state=smsState(sendJson?.data);
    if(!r.ok){await updateLeadSms(env,{id:saved.id,eventKey:event.event_key,status:'rejected',errorCode:sendJson?.errors?.[0]?.code||null});return json({ok:false,error:'sms_rejected',message:'We saved your information, but could not send the confirmation text. Please check your mobile number or ask the F45 team for help.'},502)}
    await updateLeadSms(env,{id:saved.id,eventKey:event.event_key,messageId:sendJson?.data?.id||null,status:state.status||'accepted',errorCode:state.error_code});
    return json({ok:true,lead_id:saved.id,duplicate:saved.duplicate,event_key:event.event_key,event_name:event.name,confirmation_required:true,confirmation_expires_minutes:20});
  }catch(e){return json({ok:false,error:'save_failed',message:'We could not save your information. Please try again.'},500)}
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

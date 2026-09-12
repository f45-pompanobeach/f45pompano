import {findLeadByPhone,insertLead,refreshLeadConfirmation,updateLeadSms} from './_shared.js';

const LOCAL_ZIPS = new Set(['33062','33060','33064','33069','33334','33308','33309','33441']);
const enc = new TextEncoder();
const FINAL_FAILURES = new Set(['failed','sending_failed','delivery_failed','gw_timeout','dlr_timeout']);
const FINAL_SUCCESS = new Set(['delivered']);

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' } });
}
function phone(v) { const d=String(v||'').replace(/\D/g,''); if(d.length===10)return `+1${d}`; if(d.length===11&&d[0]==='1')return `+${d}`; return null; }
function name(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,40)}
function email(v){return String(v||'').trim().toLowerCase().slice(0,120)}
function zip(v){const m=String(v||'').trim().match(/^\d{5}/);return m?m[0]:null}
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function b64text(s){return b64(enc.encode(s))}
function nonce(){const a=new Uint8Array(6);crypto.getRandomValues(a);return b64(a)}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function smsState(data){
  const status=String(data?.to?.[0]?.status||'').toLowerCase();
  const errors=Array.isArray(data?.errors)?data.errors:[];
  const error=errors[0]||null;
  return {status,error_code:error?.code||null,error_title:error?.title||null};
}
async function sign(value, secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)));return b64(sig.slice(0,12))}
async function token(firstName,isLocal,secret){const p=`${b64text(firstName.slice(0,24))}.${isLocal?'1':'0'}.${Math.floor(Date.now()/1000+1200).toString(36)}.${nonce()}`;return `${p}.${await sign(p,secret)}`}

async function emailLead(lead){
  const body=new URLSearchParams({
    _subject:`PIER Lead - ${lead.first_name} ${lead.last_name}`,_template:'table',_captcha:'false',
    'Lead Source':'Pompano Beach Pier Cleanup - 2026-09-12','Event Coach':'Jonathan','First Name':lead.first_name,'Last Name':lead.last_name,
    Email:lead.email,Phone:lead.phone,ZIP:lead.zip,'Confirmation Code':lead.confirmation_code,'Local ZIP':lead.is_local?'Yes':'No','Grand Prize Eligible':lead.is_local?'Yes':'No',
    'Confirmation SMS':'Accepted','SMS Delivery Status':lead.delivery_status||'unknown','Marketing SMS Opt-In':lead.marketing_opt_in?'Yes':'No','Submitted At':lead.submitted_at
  });
  return fetch('https://formsubmit.co/ajax/pompanobeach@f45training.com',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString()});
}

async function retrieveMessage(id, apiKey){
  try{
    const r=await fetch(`https://api.telnyx.com/v2/messages/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${apiKey}`,accept:'application/json'}});
    if(!r.ok)return null;
    const j=await r.json();
    return {data:j?.data||null,...smsState(j?.data)};
  }catch{return null}
}

export async function onRequestPost(context){
  const {request,env}=context;
  let d; try{d=await request.json()}catch{return reply({ok:false,error:'invalid_request'},400)}
  if(String(d.website||'').trim()) return reply({ok:true,sent:true});
  const firstName=name(d.first_name), lastName=name(d.last_name), e=email(d.email), p=phone(d.phone), z=zip(d.zip);
  if(firstName.length<2||lastName.length<2)return reply({ok:false,message:'Please enter your first and last name.'},400);
  if(!/^\S+@\S+\.\S+$/.test(e))return reply({ok:false,message:'Please enter a valid email address.'},400);
  if(!p)return reply({ok:false,message:'Please enter a valid U.S. mobile number.'},400);
  if(!z)return reply({ok:false,message:'Please enter a valid 5-digit ZIP code.'},400);
  if(d.verification_consent!==true||d.terms_accepted!==true)return reply({ok:false,message:'Please accept the required terms and entry-text consent.'},400);
  if(!env.TELNYX_API_KEY)return reply({ok:false,error:'sms_not_configured',message:'Confirmation texting is not configured yet. Please ask the F45 team for help.'},503);

  let existing=null;
  try{existing=await findLeadByPhone(env,p)}catch{}
  const isRepeat=Boolean(existing);
  const isLocal=isRepeat?Boolean(Number(existing.is_local)):LOCAL_ZIPS.has(z);
  const tokenFirstName=isRepeat?String(existing.first_name||firstName):firstName;
  const t=await token(tokenFirstName,isLocal,env.PIER_TOKEN_SECRET||env.TELNYX_API_KEY);
  const parts=t.split('.'), confirmationCode=String(parts[3]||'').slice(-6).toUpperCase(), tokenNonce=String(parts[3]||''), tokenExpiresAt=parseInt(parts[2],36);
  const createdAt=new Date().toISOString();
  const leadId=isRepeat?existing.id:crypto.randomUUID();

  if(isRepeat){
    try{await refreshLeadConfirmation(env,leadId,{confirmation_code:confirmationCode,token_nonce:tokenNonce,token_expires_at:tokenExpiresAt})}catch{}
  }else{
    const leadBase={id:leadId,first_name:firstName,last_name:lastName,email:e,phone:p,zip:z,confirmation_code:confirmationCode,is_local:isLocal,marketing_opt_in:d.marketing_opt_in===true,created_at:createdAt,token_nonce:tokenNonce,token_expires_at:tokenExpiresAt,sms_delivery_status:'pending_send'};
    try{await insertLead(env,leadBase)}catch{}
  }

  const confirmUrl=`https://f45pompano.com/pier/confirm?t=${encodeURIComponent(t)}`;
  const text=`F45 Pompano: Confirm entry: ${confirmUrl} Reply STOP to opt out.`;
  let r; try{r=await fetch('https://api.telnyx.com/v2/messages',{method:'POST',headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({from:env.TELNYX_FROM_NUMBER||'+17543463010',to:p,text})})}catch{
    try{await updateLeadSms(env,leadId,{status:'send_error'})}catch{}
    return reply({ok:false,message:'We could not send the confirmation text. Please try again.'},502)
  }
  let sendJson={}; try{sendJson=await r.json()}catch{}
  if(!r.ok){
    const code=sendJson?.errors?.[0]?.code||null;
    try{await updateLeadSms(env,leadId,{status:'rejected',error_code:code})}catch{}
    return reply({ok:false,error:'sms_rejected',provider_status:r.status,provider_code:code,message:'We could not send the confirmation text. Please check your mobile number or ask the F45 team for help.'},502)
  }

  const messageId=sendJson?.data?.id||null;
  let state=smsState(sendJson?.data);
  try{await updateLeadSms(env,leadId,{message_id:messageId,status:state.status||'accepted',error_code:state.error_code})}catch{}
  if(FINAL_FAILURES.has(state.status)||state.error_code){
    return reply({ok:false,error:'sms_delivery_failed',provider_code:state.error_code,provider_delivery_status:state.status,message:'The confirmation text could not be delivered. Please check your mobile number and try again.'},502);
  }

  if(messageId&&!FINAL_SUCCESS.has(state.status)){
    for(const wait of [650,1100,1800]){
      await sleep(wait);
      const latest=await retrieveMessage(messageId,env.TELNYX_API_KEY);
      if(!latest)continue;
      state={status:latest.status,error_code:latest.error_code,error_title:latest.error_title};
      try{await updateLeadSms(env,leadId,{message_id:messageId,status:state.status||'accepted',error_code:state.error_code})}catch{}
      if(FINAL_SUCCESS.has(state.status)||FINAL_FAILURES.has(state.status)||state.error_code)break;
    }
  }

  if(FINAL_FAILURES.has(state.status)||state.error_code){
    return reply({ok:false,error:'sms_delivery_failed',provider_code:state.error_code,provider_delivery_status:state.status,message:'The confirmation text could not be delivered. Please check your mobile number and try again.'},502);
  }

  if(!isRepeat){
    const lead={first_name:firstName,last_name:lastName,email:e,phone:p,zip:z,confirmation_code:confirmationCode,is_local:isLocal,marketing_opt_in:d.marketing_opt_in===true,submitted_at:createdAt,delivery_status:state.status||'accepted'};
    context.waitUntil(emailLead(lead).catch(()=>{}));
  }
  return reply({ok:true,sent:true,duplicate:isRepeat,reissued:isRepeat,lead_id:leadId,first_name:tokenFirstName,local_zip:isLocal,confirmation_code:confirmationCode,expires_minutes:20,message_id:messageId,delivery_status:state.status||'accepted',delivered:FINAL_SUCCESS.has(state.status)});
}
export function onRequest(){return reply({ok:false,error:'method_not_allowed'},405)}

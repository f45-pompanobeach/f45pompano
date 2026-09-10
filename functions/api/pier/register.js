const LOCAL_ZIPS = new Set(['33062','33060','33064','33069','33334','33308','33309','33441']);
const enc = new TextEncoder();

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
async function sign(value, secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)));return b64(sig.slice(0,12))}
async function token(firstName,isLocal,secret){const p=`${b64text(firstName.slice(0,24))}.${isLocal?'1':'0'}.${Math.floor(Date.now()/1000+1800).toString(36)}.${nonce()}`;return `${p}.${await sign(p,secret)}`}

async function emailLead(lead){
  const body=new URLSearchParams({
    _subject:`PIER Lead - ${lead.first_name} ${lead.last_name}`,_template:'table',_captcha:'false',
    'Lead Source':'Pompano Beach Pier Cleanup - 2026-09-12','Event Coach':'Jonathan','First Name':lead.first_name,'Last Name':lead.last_name,
    Email:lead.email,Phone:lead.phone,ZIP:lead.zip,'Local ZIP':lead.is_local?'Yes':'No','Grand Prize Eligible':lead.is_local?'Yes':'No',
    'Verification SMS':'Sent','Marketing SMS Opt-In':lead.marketing_opt_in?'Yes':'No','Submitted At':lead.submitted_at
  });
  return fetch('https://formsubmit.co/ajax/pompanobeach@f45training.com',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString()});
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
  if(d.verification_consent!==true||d.terms_accepted!==true)return reply({ok:false,message:'Please accept the required terms and verification-text consent.'},400);
  if(!env.TELNYX_API_KEY)return reply({ok:false,error:'sms_not_configured',message:'Verification texting is not configured yet. Please ask the F45 team for help.'},503);

  const isLocal=LOCAL_ZIPS.has(z), t=await token(firstName,isLocal,env.PIER_TOKEN_SECRET||env.TELNYX_API_KEY);
  const verifyUrl=`${new URL(request.url).origin}/pier/v/${t}`;
  const text=`F45 Pompano: Tap to verify your Pier Spin to Win entry: ${verifyUrl}`;
  let r; try{r=await fetch('https://api.telnyx.com/v2/messages',{method:'POST',headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({from:env.TELNYX_FROM_NUMBER||'+17543463010',to:p,text})})}catch{return reply({ok:false,message:'We could not send the verification text. Please try again.'},502)}
  if(!r.ok){let code=null;try{const j=await r.json();code=j?.errors?.[0]?.code||null}catch{}return reply({ok:false,error:'sms_rejected',provider_status:r.status,provider_code:code,message:'We could not send the verification text. Please check your mobile number or ask the F45 team for help.'},502)}
  const lead={first_name:firstName,last_name:lastName,email:e,phone:p,zip:z,is_local:isLocal,marketing_opt_in:d.marketing_opt_in===true,submitted_at:new Date().toISOString()};
  context.waitUntil(emailLead(lead).catch(()=>{}));
  return reply({ok:true,sent:true,first_name:firstName,local_zip:isLocal,expires_minutes:30});
}
export function onRequest(){return reply({ok:false,error:'method_not_allowed'},405)}

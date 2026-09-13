import {LOCAL_ZIPS,cleanEmail,cleanName,cleanPhone,cleanZip,json,resolveLeadEvent,saveLead} from './_shared.js';

async function emailLead(lead){
  const body=new URLSearchParams({
    _subject:`TABLE LEAD - ${lead.event_name} - ${lead.first_name} ${lead.last_name}`,
    _template:'table',_captcha:'false',
    'Lead Source':lead.event_name,
    'First Name':lead.first_name,'Last Name':lead.last_name,
    Email:lead.email,Phone:lead.phone,ZIP:lead.zip,
    'Local ZIP':lead.is_local?'Yes':'No',
    'Marketing SMS Opt-In':lead.marketing_opt_in?'Yes':'No',
    'Submitted At':lead.submitted_at
  });
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
    const saved=await saveLead(env,{event,first_name:firstName,last_name:lastName,email,phone,zip,is_local:LOCAL_ZIPS.has(zip),marketing_opt_in:d.marketing_opt_in===true,contact_consent:true});
    if(!saved.duplicate){
      context.waitUntil(emailLead({event_name:event.name,first_name:firstName,last_name:lastName,email,phone,zip,is_local:LOCAL_ZIPS.has(zip),marketing_opt_in:d.marketing_opt_in===true,submitted_at:saved.created_at}).catch(()=>{}));
    }
    return json({ok:true,lead_id:saved.id,duplicate:saved.duplicate,event_key:event.event_key,event_name:event.name});
  }catch(e){return json({ok:false,error:'save_failed',message:'We could not save your information. Please try again.'},500)}
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}

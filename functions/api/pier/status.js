const FINAL_FAILURES = new Set(['failed','sending_failed','delivery_failed','gw_timeout','dlr_timeout']);
const FINAL_SUCCESS = new Set(['delivered']);

function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function validId(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''))}

export async function onRequestGet({request,env}){
  const id=new URL(request.url).searchParams.get('id');
  if(!validId(id))return reply({ok:false,error:'invalid_message_id'},400);
  if(!env.TELNYX_API_KEY)return reply({ok:false,error:'sms_not_configured'},503);
  let r;try{r=await fetch(`https://api.telnyx.com/v2/messages/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,accept:'application/json'}})}catch{return reply({ok:false,error:'provider_unreachable'},502)}
  let j={};try{j=await r.json()}catch{}
  if(!r.ok)return reply({ok:false,error:'provider_error',provider_status:r.status},502);
  const data=j?.data||{};
  const status=String(data?.to?.[0]?.status||'').toLowerCase();
  const errors=Array.isArray(data?.errors)?data.errors:[];
  const first=errors[0]||null;
  const failed=FINAL_FAILURES.has(status)||Boolean(first);
  const delivered=FINAL_SUCCESS.has(status);
  return reply({ok:true,status:status||'unknown',delivered,failed,final:delivered||failed,error_code:first?.code||null});
}
export function onRequest(){return reply({ok:false,error:'method_not_allowed'},405)}

function out(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function mask(v){const s=String(v||'');return s.length>=4?`***${s.slice(-4)}`:'***'}
export async function onRequestGet({env}){
  if(!env.TELNYX_API_KEY)return out({ok:false,error:'not_configured'},503);
  const sender=env.TELNYX_FROM_NUMBER||'+17543463010';
  const url='https://api.telnyx.com/v2/detail_records?filter%5Brecord_type%5D=message_detail_record&sort=-created_at&page%5Bsize%5D=20';
  let r;try{r=await fetch(url,{headers:{authorization:`Bearer ${env.TELNYX_API_KEY}`,accept:'application/json'}})}catch{return out({ok:false,error:'request_failed'},502)}
  let j={};try{j=await r.json()}catch{}
  if(!r.ok)return out({ok:false,http_status:r.status,errors:j?.errors||null},502);
  const rows=(Array.isArray(j?.data)?j.data:[]).filter(x=>String(x?.cli||'')===sender&&String(x?.direction||'').toLowerCase()==='outbound').slice(0,12).map(x=>({
    created_at:x.created_at||null,
    completed_at:x.completed_at||null,
    destination:mask(x.cld),
    carrier:x.carrier||null,
    status:x.status||null,
    delivery_status:x.delivery_status||null,
    errors:x.errors||[],
    parts:x.parts??null,
    profile_name:x.profile_name||null,
    tcr_campaign_id:x.tcr_campaign_id||null
  }));
  return out({ok:true,sender,records:rows});
}
export function onRequest(){return out({ok:false,error:'method_not_allowed'},405)}

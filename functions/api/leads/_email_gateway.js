/* Server-side shared gateway client; never expose credentials to browsers. */
export async function sendGatewayEmail(env,{idempotencyKey,to,subject,fields,priority='standard'}){
 const url=String(env.EMAIL_GATEWAY_URL||'').replace(/\/+$/,'');
 const app=String(env.EMAIL_GATEWAY_APP_ID||'');
 const key=String(env.EMAIL_GATEWAY_APP_KEY||'');
 const from=String(env.EMAIL_GATEWAY_FROM||'');
 if(!url||!app||!key||!from)return {configured:false,accepted:false};
 if(!/^https:\/\//.test(url)||app!=='leads-trials'||!/^[-\w.:]{8,128}$/.test(idempotencyKey))throw Error('invalid_gateway_configuration');
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const entries=Object.entries(fields||{}).map(([k,v])=>[String(k),String(v??'')]);
 const html='<table>'+entries.map(([k,v])=>'<tr><th style="text-align:left;padding:5px">'+escape(k)+'</th><td style="padding:5px">'+escape(v)+'</td></tr>').join('')+'</table>';
 const text=entries.map(([k,v])=>k+': '+v).join('\n');
 const response=await fetch(url+'/send',{method:'POST',headers:{'content-type':'application/json','x-email-app':app,authorization:'Bearer '+key,'idempotency-key':idempotencyKey},body:JSON.stringify({from,to,subject,html,text,priority})});
 const result=await response.json().catch(()=>({}));
 if(response.status!==202||result.ok!==true||!result.id)throw Error('gateway_rejected_'+response.status);
 return {configured:true,accepted:true,id:String(result.id),state:String(result.state||'pending')};
}
export async function gatewayStatus(env,id){
 const url=String(env.EMAIL_GATEWAY_URL||'').replace(/\/+$/,'');
 const r=await fetch(url+'/messages/'+encodeURIComponent(id),{headers:{'x-email-app':String(env.EMAIL_GATEWAY_APP_ID||''),authorization:'Bearer '+String(env.EMAIL_GATEWAY_APP_KEY||'')}});
 if(!r.ok)throw Error('gateway_status_'+r.status);
 return r.json();
}

export function onRequestGet({env}){
  const configured=Boolean(env?.LANDING_MEDIA&&typeof env.LANDING_MEDIA.get==='function'&&typeof env.LANDING_MEDIA.put==='function');
  return new Response(JSON.stringify({ok:true,configured,binding:'LANDING_MEDIA'}),{
    status:200,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0'}
  });
}
export function onRequest(){return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json; charset=utf-8'}})}

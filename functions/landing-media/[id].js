function notFound(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}})}
export async function onRequestGet({request,env,params}){
  if(!env?.LANDING_MEDIA||typeof env.LANDING_MEDIA.get!=='function')return notFound();
  const key=String(params.id||'').replace(/[^a-zA-Z0-9._-]/g,'');
  if(!key)return notFound();

  const head=await env.LANDING_MEDIA.head(key);
  if(!head)return notFound();

  const headers=new Headers();
  headers.set('content-type',head.httpMetadata?.contentType||'video/mp4');
  headers.set('accept-ranges','bytes');
  headers.set('cache-control',head.httpMetadata?.cacheControl||'public, max-age=31536000, immutable');
  headers.set('etag',head.httpEtag||head.etag||'');

  const size=Number(head.size||0);
  const range=request.headers.get('range');
  if(range&&size>0){
    const m=range.match(/^bytes=(\d*)-(\d*)$/);
    if(m){
      let start=m[1]?Number(m[1]):0;
      let end=m[2]?Number(m[2]):size-1;
      if(!m[1]&&m[2]){const suffix=Number(m[2]);start=Math.max(0,size-suffix);end=size-1}
      start=Math.max(0,Math.min(start,size-1));end=Math.max(start,Math.min(end,size-1));
      const length=end-start+1;
      const obj=await env.LANDING_MEDIA.get(key,{range:{offset:start,length}});
      if(!obj)return notFound();
      headers.set('content-range',`bytes ${start}-${end}/${size}`);
      headers.set('content-length',String(length));
      return new Response(obj.body,{status:206,headers});
    }
  }

  const obj=await env.LANDING_MEDIA.get(key);
  if(!obj)return notFound();
  if(size)headers.set('content-length',String(size));
  return new Response(obj.body,{status:200,headers});
}
export function onRequest(){return new Response('Method not allowed',{status:405})}

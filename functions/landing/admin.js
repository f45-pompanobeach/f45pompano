export async function onRequestGet({request,next}){
  const url=new URL(request.url);
  url.pathname='/landing/admin/index.html';
  url.search='';
  const response=await next(new Request(url.toString(),request));
  if(!response||!response.ok)return new Response('Landing Admin unavailable',{status:503});
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, max-age=0');
  return new Response(response.body,{status:200,headers});
}
export function onRequest(){return new Response('Method not allowed',{status:405})}

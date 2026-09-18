export function onRequestGet({request}){
  const from=new URL(request.url);
  const to=new URL('/landing/admin/',from.origin);
  return Response.redirect(to.toString(),302);
}
export function onRequest(){return new Response('Method not allowed',{status:405})}

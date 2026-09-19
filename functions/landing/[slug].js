import {getGlobal,getPage} from '../api/landing/_shared.js';

function htmlResponse(body,status=200){
  return new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}});
}
export async function onRequestGet({request,env,params,next}){
  const slug=String(params.slug||'').toLowerCase().trim();
  if(slug==='admin')return next(request);
  if(!slug||slug==='social-trial')return htmlResponse('Not found',404);

  const page=await getPage(env,slug);
  if(!page||page.enabled===false||page.pageKind==='root')return htmlResponse('Landing page not found',404);

  const global=await getGlobal(env);

  // Ask Pages for the already-built neutral static template internally.
  // This avoids a self-fetch through f45pompano.com, which could fail/loop.
  const templateUrl=new URL(request.url);
  templateUrl.pathname='/_landing-template/';
  templateUrl.search='';
  const templateRequest=new Request(templateUrl.toString(),request);
  const templateResponse=await next(templateRequest);
  if(!templateResponse||!templateResponse.ok)return htmlResponse('Landing template unavailable',503);

  let html=await templateResponse.text();
  const preload=JSON.stringify({slug,page,global}).replace(/</g,'\\u003c');
  html=html.replace(
    '<script defer src="/landing-runtime.js?v=4"></script>',
    `<script>window.__LANDING_PRELOADED__=${preload};</script><script defer src="/landing-runtime.js?v=4"></script>`
  );
  return htmlResponse(html);
}
export function onRequest(){return htmlResponse('Method not allowed',405)}

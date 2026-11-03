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
  // Dynamic partner pages use one explicit tracker. Remove the template copy to
  // prevent duplicate visit records when the neutral template contains tracking.
  html=html.replace(/<script>\s*\/\* First-party, non-blocking page and attribution tracking\. \*\/[\s\S]*?<\/script>/g,'');
  const trackingScript=`<script>
  (function(){
    try{
      if(window.__f45PageVisitSent)return;
      var parts=location.pathname.split('/').filter(Boolean);
      var name=parts[0]==='landing'?(parts[1]||'landing'):(parts[0]||'root');
      if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name))return;
      var key='f45_page_tracking_session',sid=sessionStorage.getItem(key);
      if(!/^[a-f0-9]{32}$/.test(sid||'')){
        sid=Array.from(crypto.getRandomValues(new Uint8Array(16)),function(x){return x.toString(16).padStart(2,'0')}).join('');
        sessionStorage.setItem(key,sid);
      }
      var q=new URLSearchParams(location.search),payload={page:name,session:sid,referrer:document.referrer||''};
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','ad_id'].forEach(function(k){payload[k]=(q.get(k)||'').slice(0,160)});
      window.__f45PageVisitSent=true;
      fetch('/api/page-tracking/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',keepalive:true}).catch(function(){});
    }catch(e){}
  })();
  </script>`;
  html=html.replace('</body>',trackingScript+'\\n</body>');
  return htmlResponse(html);
}
export function onRequest(){return htmlResponse('Method not allowed',405)}

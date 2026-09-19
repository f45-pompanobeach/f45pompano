import {getGlobal,getPage} from '../api/landing/_shared.js';
import {ensureSchema,eventDb} from '../api/leads/_shared.js';

function htmlResponse(body,status=200){
  return new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}});
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function floridaNowParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const out={};for(const part of parts)if(part.type!=='literal')out[part.type]=part.value;
  return {date:`${out.year}-${out.month}-${out.day}`,time:`${out.hour}:${out.minute}`};
}
function eventEnded(event,now=new Date()){
  if(!event?.event_date)return false;
  const p=floridaNowParts(now);
  if(p.date>event.event_date)return true;
  if(p.date<event.event_date)return false;
  return p.time>String(event.end_time||'23:59');
}
function formatEventDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
  try{return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))}catch{return value}
}
async function linkedEvent(env,slug){
  if(!slug||!await ensureSchema(env))return null;
  return eventDb(env).prepare('SELECT event_key,name,slug,event_date,start_time,end_time,enabled,archived,prize_enabled,confirmation_enabled FROM lead_events WHERE slug=? LIMIT 1').bind(slug).first();
}
function eventLandingHtml(page,event,{archived=false}={}){
  const name=event?.name||page.partner||'F45 Community Event';
  const date=formatEventDate(event?.event_date);
  const archivedMessage=page.archivedMessage||'This event has ended, but you can still connect with F45 Training Pompano Beach.';
  const title=archived?`${name} | Event Ended`:`${name} | F45 Training Pompano Beach`;
  const cta=archived
    ? '<a class="cta secondary" href="/">Visit F45 Pompano Beach</a>'
    : `<a class="cta" href="/tableleads/?event=${encodeURIComponent(page.leadEventSlug)}">Connect with F45</a>`;
  const status=archived
    ? '<div class="status">EVENT ENDED</div>'
    : '<div class="status live">F45 COMMUNITY EVENT</div>';
  const body=archived
    ? `<p class="lead">${esc(archivedMessage)}</p>`
    : '<p class="lead">Stop by and connect with the F45 Training Pompano Beach team. Enter your information to get started, and we’ll guide you through any event-specific next steps.</p>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1C1C2E">
${archived?'<meta name="robots" content="noindex,follow">':''}
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eef1f6;color:#1c1c2e}body{display:grid;place-items:center;padding:22px}.card{width:min(680px,100%);overflow:hidden;background:#fff;border-radius:22px;box-shadow:0 22px 70px rgba(28,28,46,.18);border-top:7px solid #e8272a}.hero{background:#1c1c2e;color:#fff;padding:42px 28px 38px;text-align:center}.brand{font-size:12px;font-weight:900;letter-spacing:2.2px;color:#ffcc00}.status{display:inline-block;margin:18px 0 14px;padding:7px 11px;border-radius:999px;background:#eef1f6;color:#596273;font-size:11px;font-weight:900;letter-spacing:1.4px}.status.live{background:#ffcc00;color:#1c1c2e}.hero h1{margin:0;font-size:clamp(32px,7vw,52px);line-height:1;font-weight:900;text-transform:uppercase;letter-spacing:-1px}.date{margin:13px 0 0;color:#d6d9e3;font-size:15px;font-weight:800}.content{padding:30px 28px 34px;text-align:center}.lead{margin:0 auto 24px;max-width:520px;color:#4b5563;font-size:16px;line-height:1.65}.cta{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:15px 28px;border-radius:9px;background:#e8272a;color:#fff;text-decoration:none;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:.6px}.cta:hover{background:#c91f22}.cta.secondary{background:#1c1c2e}.fine{margin:18px 0 0;color:#7a8190;font-size:12px;line-height:1.5}.home{display:inline-block;margin-top:18px;color:#596273;font-size:12px;font-weight:800;text-decoration:none}@media(max-width:560px){body{padding:10px}.hero{padding:34px 20px 30px}.content{padding:25px 20px 30px}.cta{width:100%}}
</style>
</head>
<body>
<main class="card">
<section class="hero">
<div class="brand">F45 TRAINING POMPANO BEACH</div>
${status}
<h1>${esc(name)}</h1>
${date?`<p class="date">${esc(date)}</p>`:''}
</section>
<section class="content">
${body}
${cta}
${archived?'':'<p class="fine">Your information will be connected to this event automatically.</p>'}
<a class="home" href="/">f45pompano.com</a>
</section>
</main>
</body>
</html>`;
}

export async function onRequestGet({request,env,params,next}){
  const slug=String(params.slug||'').toLowerCase().trim();
  if(slug==='admin')return next(request);
  if(!slug||slug==='social-trial')return htmlResponse('Not found',404);

  const page=await getPage(env,slug);
  if(!page||page.enabled===false||page.pageKind==='root')return htmlResponse('Landing page not found',404);

  if(page.pageKind==='event'){
    const event=await linkedEvent(env,page.leadEventSlug);
    const archived=page.status==='archived'||!event||Number(event.archived)===1||Number(event.enabled)!==1||eventEnded(event);
    return htmlResponse(eventLandingHtml(page,event,{archived}));
  }

  if(page.status==='archived')return htmlResponse(eventLandingHtml(page,null,{archived:true}));

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

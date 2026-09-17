import {markLeadConfirmed} from '../api/leads/_shared.js';

const enc=new TextEncoder(),dec=new TextDecoder();
function b64(a){let s='';for(const b of a)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function unb64(v){const p=v.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-v.length%4)%4),s=atob(p),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
async function sign(v,secret){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const s=new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(v)));return b64(s.slice(0,18))}
function equal(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
const css=`*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#EDF0F8;color:#111}.shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{width:min(560px,100%);background:#fff;border-radius:18px;padding:30px 24px;text-align:center;box-shadow:0 18px 48px rgba(28,28,46,.16);border-top:7px solid #E8272A}.icon{margin:0 auto 15px;width:82px;height:82px;border-radius:50%;display:grid;place-items:center;font-size:44px;font-weight:900;background:#E9FBEF;color:#16833B;border:3px solid #54C978}.bad{background:#FFF0F0;color:#B91C1C;border-color:#F1A6A6}.eyebrow{font-size:12px;font-weight:900;letter-spacing:2px;color:#16833B;margin-bottom:8px}h1{font-size:clamp(27px,7vw,38px);line-height:1.05;margin:0 0 12px;color:#1C1C2E;font-weight:900}p{font-size:16px;line-height:1.55;color:#4B5563;margin:0}.fine{font-size:11px;color:#6B7280;margin-top:18px}`;
function page(ok,name,expired=false){const safe=esc(name||'');return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${ok?'Entry Confirmed':'Confirmation Problem'} | F45 Pompano</title><style>${css}</style></head><body><main class="shell"><section class="card"><div class="icon ${ok?'':'bad'}">${ok?'✓':'!'}</div><div class="eyebrow">${ok?'ENTRY CONFIRMED':'F45 POMPANO BEACH'}</div><h1>${ok?(safe?`${safe}, YOU'RE CONFIRMED!`:`YOU'RE CONFIRMED!`):(expired?'LINK EXPIRED':'CONFIRMATION LINK INVALID')}</h1><p>${ok?'Your information has been confirmed. You can show this screen to the F45 team.':expired?'This confirmation link has expired. Please submit the event form again to get a new text.':'This confirmation link could not be verified. Please ask the F45 team for help.'}</p><div class="fine">F45 Training Pompano Beach</div></section></main></body></html>`}
function out(body,status=200){return new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'}})}
export async function onRequestGet({request,env}){
  const secret=env.TABLE_LEADS_TOKEN_SECRET||env.PIER_TOKEN_SECRET||env.TELNYX_API_KEY;if(!secret)return out(page(false,''),503);
  const t=String(new URL(request.url).searchParams.get('t')||''),parts=t.split('.');if(parts.length!==2)return out(page(false,''),400);
  const [body,sig]=parts;if(!/^[A-Za-z0-9_-]+$/.test(body)||!/^[A-Za-z0-9_-]+$/.test(sig)||!equal(sig,await sign(body,secret)))return out(page(false,''),400);
  let p;try{p=JSON.parse(dec.decode(unb64(body)))}catch{return out(page(false,''),400)}
  if(!p||!p.id||!p.event_key||!p.nonce||!Number.isFinite(Number(p.exp)))return out(page(false,''),400);
  if(Number(p.exp)<Math.floor(Date.now()/1000))return out(page(false,p.name,true),410);
  try{const ok=await markLeadConfirmed(env,{id:String(p.id),eventKey:String(p.event_key),nonce:String(p.nonce)});if(!ok)return out(page(false,p.name),400)}catch{return out(page(false,p.name),500)}
  return out(page(true,p.name));
}
export function onRequest(){return new Response('Method not allowed',{status:405})}

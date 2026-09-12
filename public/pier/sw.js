const CACHE='f45-table-leads-v2';
const SHELL=['/pier/','/pier/staff/','/pier/manifest.webmanifest','/pier/table-leads-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/pier/confirm')||url.pathname.startsWith('/pier/v/'))return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();if(res.ok)caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});return res}).catch(()=>caches.match(req).then(cached=>cached||caches.match(url.pathname.endsWith('/staff/')?'/pier/staff/':'/pier/'))));
});

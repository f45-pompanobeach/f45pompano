const OLD_PREFIX='f45-leads-trials-';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith(OLD_PREFIX)).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;
  if(event.request.mode==='navigate'&&(u.pathname==='/admin/'||u.pathname==='/admin')){
    event.respondWith(Response.redirect('/leads-trials/',302));
    return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}));
});

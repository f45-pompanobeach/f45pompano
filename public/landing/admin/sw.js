const CACHE='landing-admin-v8';
const CORE=[
  '/landing/admin/',
  '/landing/admin/app.css?v=14',
  '/landing/admin/app.js?v=14',
  '/landing/admin/manifest.webmanifest',
  '/landing/admin/icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.startsWith('/landing/admin/'))return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('/landing/admin/')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
      return response;
    }))
  );
});

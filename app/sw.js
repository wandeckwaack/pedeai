const CACHE='pedeai-web-v4-email-only-4';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/app/','/app/index.html','/app/manifest.webmanifest','../icon.svg'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  const u=new URL(e.request.url), html=e.request.mode==='navigate'||u.pathname==='/app/'||u.pathname==='/app/index.html';
  e.respondWith((html?fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('/app/index.html',copy));return r}).catch(()=>caches.match('/app/index.html')):caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('/app/')))));
});

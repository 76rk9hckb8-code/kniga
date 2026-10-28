// Offline cache for the reading shelf.
const CACHE='ves-v1';
const SHELL=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const FONT_CSS='https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Nunito:wght@400;600;700;800&display=swap';
async function put(c,url){try{const r=await fetch(url,{cache:'no-cache'});if(r.ok){await c.put(url,r.clone());return r;}}catch(_){}return null;}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  for(const u of SHELL)await put(c,u);
  const css=await put(c,FONT_CSS);
  if(css){const txt=await css.text();for(const m of txt.matchAll(/url\((https:[^)]+)\)/g))await put(c,m[1]);}
  await self.skipWaiting();
})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith('ves-')&&k!==CACHE)await caches.delete(k);
  await self.clients.claim();
})());});
function refresh(req){caches.open(CACHE).then(c=>fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))return c.put(req,r);}).catch(()=>{})).catch(()=>{});}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      const hit=(await c.match('index.html'))||(await c.match('./'));
      if(hit){refresh(new Request('index.html'));return hit;}
      try{const r=await fetch(req);if(r.ok)c.put('index.html',r.clone());return r;}
      catch(_){return new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">Нет интернета. Откройте приложение один раз с интернетом, после этого она будет работать и без него.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}});}
    })());return;
  }
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const hit=(await c.match(req))||(await c.match(req.url));
    if(hit){refresh(req);return hit;}
    try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;}
    catch(_){return new Response('',{status:504});}
  })());
});

// Offline cache: after one launch with internet the app opens without it.
const CACHE='kniga-v13';
const SHELL=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];
const FONT_CSS='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap';

async function put(c,url){try{const r=await fetch(url,{cache:'no-cache'});if(r.ok){await c.put(url,r.clone());return r;}}catch(_){}return null;}

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    for(const u of SHELL)await put(c,u);
    for(const u of LIBS)await put(c,u);
    const css=await put(c,FONT_CSS);
    if(css){const txt=await css.text();const urls=[...txt.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]);
      for(const u of urls)await put(c,u);}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k.startsWith('kniga-')&&k!==CACHE)await caches.delete(k);
    await self.clients.claim();
  })());
});

function refresh(req){
  // update the copy in the background; never fails the response
  caches.open(CACHE).then(c=>fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))return c.put(req,r);}).catch(()=>{})).catch(()=>{});
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const path=new URL(req.url).pathname;
  // other apps in subfolders (e.g. /chtenie/) handle themselves
  if(new URL(req.url).origin===location.origin&&/\/kniga\/[^/]+\//.test(path))return;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      const hit=(await c.match('index.html'))||(await c.match('./'));
      if(hit){refresh(new Request('index.html'));return hit;}
      try{const r=await fetch(req);if(r.ok)c.put('index.html',r.clone());return r;}
      catch(_){return new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">Нет интернета. Откройте приложение один раз с интернетом, после этого оно будет работать и без него.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}});}
    })());
    return;
  }
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    const hit=await c.match(req,{ignoreSearch:false})||await c.match(req.url);
    if(hit){refresh(req);return hit;}
    try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;}
    catch(_){return new Response('',{status:504});}
  })());
});

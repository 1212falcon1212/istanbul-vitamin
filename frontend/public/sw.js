/* Only the generic offline document is persisted. Never cache HTML commerce pages,
 * API, RSC, prices, stock, account, basket, checkout or third-party responses. */
const CACHE = 'iv-offline-v3';
const OFFLINE = '/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(OFFLINE, {cache:'reload'}))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('iv-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Waiting updates activate only after an explicit user action. No forced checkout reload.
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
});

// FCM HTTP v1 data-only payloads, shared with the PWA worker.
self.addEventListener('push', event => {
  let payload; try { payload=event.data?.json(); } catch { return; }
  const data=payload?.data;if(!data || typeof data.title!=='string')return;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const visible=windows.filter(client=>client.visibilityState==='visible');
    if(visible.length){visible.forEach(client=>client.postMessage({type:'IV_PUSH',title:data.title,body:data.body||''}));return;}
    await self.registration.showNotification(data.title,{body:data.body||'',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',data:{path:data.path||'/'}});
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let url;try{url=new URL(event.notification.data?.path||'/',self.location.origin);}catch{return;}
  if(url.origin!==self.location.origin)url=new URL('/',self.location.origin);
  event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===url.origin){await client.navigate(url.href);return client.focus();}}return self.clients.openWindow(url.href);})());
});

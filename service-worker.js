'use strict';

const CACHE_NAME = 'static-cache-v1.2.21';

const FILES_TO_CACHE = [
  'https://brawer.online/budget/',
  'https://brawer.online/budget/index.html',
  'https://brawer.online/style/jquery.mobile-1.4.5.min.js',
  "https://brawer.online/style/jquery-1.11.1.min.js",
  "https://brawer.online/style/jquery.mobile-1.4.5.min.css",
  'https://brawer.online/style/jquery-ui-1.12.1.custom/jquery-ui.min.css',
  'https://brawer.online/style/jquery-ui-1.12.1.custom/jquery-ui.min.js',
  'https://brawer.online/budget/js/app.js',
  'https://brawer.online/style/images/ajax-loader.gif',
  'https://brawer.online/budget/faq.html'
  ];


importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.5.0/workbox-sw.js');

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);

  workbox.precaching.precacheAndRoute([]);

} 

workbox.routing.registerRoute(
  /\.(?:js|css|html|gif)$/,
  workbox.strategies.cacheFirst({
  	cacheName: CACHE_NAME
  })
  );

self.addEventListener('install', event => {
  console.log('V1 installing…');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
     return cache.addAll(FILES_TO_CACHE);
     })
  );
});


self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

/*self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  // CODELAB: Add fetch event handler here.
  if (evt.request.mode !== 'navigate') {
  // Not a page navigation, bail.
  return;
}
evt.respondWith(
    fetch(evt.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
              .then((cache) => {
                return cache.match('/budget/budget.html');
              });
        })
);
});
*/
self.addEventListener('fetch', function(event) {
	event.respondWith(
		caches.match(event.request).then(function(response) {
			
          		return response || fetch(event.request).catch(error => {
              			// Return the offline page
              			
              			return caches.match('https://brawer.online/budget/index.html');
          		});
			

    
		})
		
	);
});
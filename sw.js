// Guarda os arquivos do app para funcionar sem internet.
const CACHE = 'aliquota-v3';
const ARQUIVOS = [
  './',
  'index.html',
  'css/style.css',
  'js/tabelas.js',
  'js/calculos.js',
  'js/app.js',
  'manifest.json',
  'icone.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Rede primeiro, para receber atualizações; cache quando estiver offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resposta;
      })
      .catch(() => caches.match(e.request))
  );
});

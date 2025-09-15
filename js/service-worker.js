// ===============================================
// SERVICE WORKER - GESTIÓN DE CACHE Y ACTUALIZACIONES
// ===============================================

const CACHE_NAME = 'gestorcp-v1.0.0';
const STATIC_CACHE = 'gestorcp-static-v1.0.0';
const DYNAMIC_CACHE = 'gestorcp-dynamic-v1.0.0';

// Archivos críticos que deben estar en caché
const CRITICAL_FILES = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/manifest.json',
    '/css/dashboard.css',
    '/css/styles.css'
];

// Archivos que NO deben cachearse (siempre frescos)
const NO_CACHE_PATTERNS = [
    /\/js\/.*\.js\?v=/,
    /\/css\/.*\.css\?v=/,
    /sync-manager\.js/,
    /bugfixing-timers\.js/,
    /dashboard-core\.js/,
    /dashboard-ui\.js/
];

// ===============================================
// INSTALACIÓN DEL SERVICE WORKER
// ===============================================

self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Service Worker: Cacheando archivos críticos...');
                return cache.addAll(CRITICAL_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker: Instalación completada');
                return self.skipWaiting();
            })
    );
});

// ===============================================
// ACTIVACIÓN DEL SERVICE WORKER
// ===============================================

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Eliminar caches antiguos
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activación completada');
                return self.clients.claim();
            })
    );
});

// ===============================================
// INTERCEPTACIÓN DE REQUESTS
// ===============================================

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Verificar si es un archivo que NO debe cachearse
    const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
    
    if (shouldNotCache) {
        // Para archivos JS/CSS con versiones, siempre ir a la red primero
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Si la respuesta es exitosa, actualizar caché
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    // Si falla la red, buscar en caché
                    return caches.match(request);
                })
        );
        return;
    }
    
    // Para otros archivos, usar estrategia cache-first
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(request)
                    .then(response => {
                        // Verificar si la respuesta es válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clonar la respuesta para el caché
                        const responseClone = response.clone();
                        
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                        
                        return response;
                    });
            })
    );
});

// ===============================================
// COMUNICACIÓN CON LA APP
// ===============================================

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
    
    if (event.data && event.data.type === 'CHECK_UPDATE') {
        // Verificar si hay una nueva versión disponible
        fetch('/?check-update=true', { cache: 'no-cache' })
            .then(response => {
                if (response.headers.get('sw-update-available')) {
                    event.ports[0].postMessage({ 
                        updateAvailable: true,
                        version: response.headers.get('sw-version')
                    });
                } else {
                    event.ports[0].postMessage({ updateAvailable: false });
                }
            })
            .catch(() => {
                event.ports[0].postMessage({ updateAvailable: false });
            });
    }
});

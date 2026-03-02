/**
 * Service Worker - 图片缓存
 * 用于缓存模板图片，提升二次加载速度
 */

const CACHE_NAME = 'prompt-fill-images-v1';
const IMAGE_CACHE_NAME = 'prompt-fill-img-cache-v1';

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/Logo_icon.svg',
  '/favicon.svg',
  '/manifest.json'
];

// 图片域名白名单（只缓存这些域名的图片）
const IMAGE_DOMAINS = [
  'aipromptfill.com',
  'img.freepik.com',
  'images.unsplash.com',
  'cdn.pixabay.com',
  'i.imgur.com',
  'github.com',
  'raw.githubusercontent.com',
  // 模板图片 CDN 域名
  's3.bmp.ovh',
  's41.ax1x.com',
  'img.wjwj.top',
];

// 检查是否是图片 URL
function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/i.test(url) ||
         url.includes('freepik') ||
         url.includes('unsplash') ||
         url.includes('pixabay') ||
         url.includes('imgur');
}

// 检查是否应该缓存该图片
function shouldCacheImage(url) {
  try {
    const urlObj = new URL(url);
    // 缓存本地图片或白名单域名的图片
    if (urlObj.origin === self.location.origin) {
      return true;
    }
    return IMAGE_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

// 安装事件 - 预缓存核心静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME &&
                     cacheName !== IMAGE_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 拦截网络请求 - 缓存图片
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 策略 1: 图片缓存 - Network First with Cache Fallback
  // 优先从网络获取最新图片，失败则使用缓存
  if (isImage(url.href) && shouldCacheImage(url.href)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 检查响应是否有效
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆响应并缓存
          const responseToCache = response.clone();
          caches.open(IMAGE_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // 网络失败，从缓存读取
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] 从缓存加载图片:', url.href);
              return cachedResponse;
            }
            // 如果缓存也没有，返回失败
            throw new Error('Image not in cache');
          });
        })
    );
    return;
  }

  // 策略 2: 静态资源 - Cache First
  // 对于核心静态资源，优先使用缓存
  if (PRECACHE_URLS.some(precacheUrl => url.pathname === precacheUrl)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request);
      })
    );
    return;
  }

  // 策略 3: API 和数据文件 - Network Only
  // 不缓存 API 请求和数据文件（确保获取最新数据）
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 其他请求 - 正常通过网络
  event.respondWith(fetch(request));
});

// 消息事件 - 处理来自客户端的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    event.waitUntil(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.keys().then((keys) => {
          return Promise.all(
            keys.map(request => cache.delete(request))
          );
        });
      })
    );
  }
});

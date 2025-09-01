/**
 * PSYCO Service Worker - 离线支持和缓存策略
 * PSYCO Service Worker - Offline support and caching strategies
 */

const CACHE_NAME = 'psyco-v1.0.0'
const RUNTIME_CACHE = 'psyco-runtime'
const OFFLINE_URL = '/offline.html'

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// 需要运行时缓存的资源模式
const CACHE_PATTERNS = {
  // 静态资源 - 缓存优先策略
  static: [
    /\.(?:js|css|woff2?|eot|ttf|otf)$/,
    /\/icons\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    /\/images\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/
  ],
  
  // API请求 - 网络优先，后退到缓存
  api: [
    /\/api\/.*$/,
  ],
  
  // 页面 - 网络优先，后退到缓存
  pages: [
    /^https?:\/\/.*\.(?:psycho-social|psycho-connect|psycho-support|psycho-friends|mindpsycho)\.(?:com|net|org|app)\//
  ]
}

// 安装事件 - 预缓存关键资源
self.addEventListener('install', event => {
  console.log('🚀 PSYCO Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Precaching static resources')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => {
        console.log('✅ PSYCO Service Worker installed successfully')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('❌ Service Worker installation failed:', error)
      })
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('🔄 PSYCO Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
            })
            .map(cacheName => {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('✅ PSYCO Service Worker activated')
        return self.clients.claim()
      })
      .catch(error => {
        console.error('❌ Service Worker activation failed:', error)
      })
  )
})

// 请求拦截 - 实现缓存策略
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非HTTP请求
  if (!url.protocol.startsWith('http')) {
    return
  }

  // 跳过Chrome扩展请求
  if (url.protocol === 'chrome-extension:') {
    return
  }

  event.respondWith(handleRequest(request))
})

// 处理请求的核心逻辑
async function handleRequest(request) {
  const url = new URL(request.url)
  const method = request.method

  try {
    // 只缓存GET请求
    if (method !== 'GET') {
      return await fetch(request)
    }

    // 静态资源 - 缓存优先策略
    if (isStaticResource(url)) {
      return await cacheFirst(request)
    }

    // API请求 - 网络优先策略
    if (isApiRequest(url)) {
      return await networkFirst(request)
    }

    // 页面请求 - 网络优先策略
    if (isPageRequest(url)) {
      return await networkFirst(request, true)
    }

    // 其他请求 - 直接请求网络
    return await fetch(request)

  } catch (error) {
    console.error('🚨 Request handling error:', error)
    
    // 返回离线页面或缓存的响应
    if (isPageRequest(url)) {
      const cachedResponse = await caches.match(OFFLINE_URL)
      return cachedResponse || new Response('离线模式 - 请检查网络连接', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    }

    throw error
  }
}

// 缓存优先策略
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    console.log('💾 Serving from cache:', request.url)
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
      console.log('📥 Cached network response:', request.url)
    }
    
    return networkResponse
  } catch (error) {
    console.error('❌ Network request failed:', error)
    throw error
  }
}

// 网络优先策略
async function networkFirst(request, fallbackToOffline = false) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse && networkResponse.status === 200) {
      // 缓存成功的响应
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
      console.log('🌐 Network response cached:', request.url)
    }
    
    return networkResponse
  } catch (error) {
    console.log('🔄 Network failed, trying cache:', request.url)
    
    // 网络失败，尝试从缓存获取
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      console.log('💾 Serving from cache fallback:', request.url)
      return cachedResponse
    }

    // 如果是页面请求且启用离线回退
    if (fallbackToOffline) {
      const offlineResponse = await caches.match(OFFLINE_URL)
      if (offlineResponse) {
        console.log('📄 Serving offline page')
        return offlineResponse
      }
    }

    throw error
  }
}

// 检查是否为静态资源
function isStaticResource(url) {
  return CACHE_PATTERNS.static.some(pattern => pattern.test(url.pathname))
}

// 检查是否为API请求
function isApiRequest(url) {
  return CACHE_PATTERNS.api.some(pattern => pattern.test(url.pathname))
}

// 检查是否为页面请求
function isPageRequest(url) {
  return CACHE_PATTERNS.pages.some(pattern => pattern.test(url.href)) ||
         url.pathname.startsWith('/') && !url.pathname.includes('.')
}

// 后台同步事件
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// 执行后台同步
async function doBackgroundSync() {
  try {
    // 这里可以实现离线时的数据同步逻辑
    // 例如：上传离线时产生的聊天消息、情绪记录等
    console.log('📤 Performing background sync...')
    
    // 示例：同步离线消息
    await syncOfflineData()
    
    console.log('✅ Background sync completed')
  } catch (error) {
    console.error('❌ Background sync failed:', error)
  }
}

// 同步离线数据
async function syncOfflineData() {
  // 从IndexedDB获取离线数据并同步到服务器
  // 这里可以根据实际需求实现
  return Promise.resolve()
}

// 推送通知事件
self.addEventListener('push', event => {
  console.log('📨 Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : '您收到了新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: '查看',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/xmark.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('PSYCO', options)
  )
})

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action)
  
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// 消息事件 - 与主线程通信
self.addEventListener('message', event => {
  console.log('📨 Message from main thread:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_STATUS') {
    event.ports[0].postMessage({
      type: 'CACHE_STATUS_RESPONSE',
      cacheNames: await caches.keys(),
      cacheSize: await getCacheSize()
    })
  }
})

// 获取缓存大小
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys()
    let totalSize = 0
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      
      for (const key of keys) {
        const response = await cache.match(key)
        if (response) {
          const blob = await response.blob()
          totalSize += blob.size
        }
      }
    }
    
    return totalSize
  } catch (error) {
    console.error('❌ Error calculating cache size:', error)
    return 0
  }
}

console.log('🎯 PSYCO Service Worker loaded successfully!')
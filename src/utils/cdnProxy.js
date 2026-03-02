/**
 * CDN 代理和智能备选方案
 * 提供：
 * 1. 图片跨域代理
 * 2. 自动降级和重试机制
 * 3. 格式转换和优化
 * 4. 国内 CDN 备选方案
 */

import CONFIG from '../constants/config.js';

/**
 * CDN 服务提供商配置
 */
const CDN_PROVIDERS = {
  WESERV: {
    name: 'weserv.nl',
    url: 'https://images.weserv.nl/',
    region: 'global',
    reliability: 0.95,
  },
  BGKILL: {
    name: 'bgkill.com',
    url: 'https://images.bgkill.com/',
    region: 'cn',
    reliability: 0.85,
  },
  ALIYUN: {
    name: '阿里云 OSS',
    url: 'https://img-cn.aliyun.com/',
    region: 'cn',
    reliability: 0.92,
  },
  QINIU: {
    name: '七牛云',
    url: 'https://dn-qiniu.qbox.me/',
    region: 'cn',
    reliability: 0.90,
  },
};

/**
 * CDN 服务状态缓存
 * key: 服务名称，value: { lastCheck, isOnline, responseTime }
 */
const cdnStatusCache = new Map();

/**
 * 获取用户所在地区（简单判断）
 * @returns {string} 'cn' | 'global'
 */
const getUserRegion = () => {
  // 简单判断：可以根据 IP 地址或其他方式更精确判断
  // 这里使用时区作为简单判断
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone.includes('Asia/Shanghai') || timezone.includes('Asia/Hong_Kong')
    ? 'cn'
    : 'global';
};

/**
 * 根据地区选择最优 CDN 提供商
 * @param {string} region - 用户地区
 * @returns {Array} CDN 提供商排序列表
 */
const selectCDNProviders = (region = 'global') => {
  const providers = Object.entries(CDN_PROVIDERS);

  // 按地区和可靠性排序
  return providers
    .sort((a, b) => {
      const [, providerA] = a;
      const [, providerB] = b;

      // 优先选择本地区的 CDN
      if (region === 'cn') {
        if (providerA.region === 'cn' && providerB.region !== 'cn') return -1;
        if (providerA.region !== 'cn' && providerB.region === 'cn') return 1;
      }

      // 其次按可靠性排序
      return providerB.reliability - providerA.reliability;
    })
    .map(([, provider]) => provider);
};

/**
 * 检查 CDN 服务是否在线
 * @param {object} provider - CDN 提供商配置
 * @returns {Promise<boolean>} 是否在线
 */
const checkCDNHealth = async (provider) => {
  // 检查缓存
  const cached = cdnStatusCache.get(provider.name);
  if (cached && Date.now() - cached.lastCheck < 5 * 60 * 1000) {
    // 缓存有效期 5 分钟
    return cached.isOnline;
  }

  try {
    const startTime = performance.now();
    const response = await fetch(provider.url, {
      method: 'HEAD',
      mode: 'no-cors',
      timeout: 3000,
    });
    const responseTime = performance.now() - startTime;

    const isOnline = responseTime < 5000; // 响应时间小于 5 秒视为在线

    cdnStatusCache.set(provider.name, {
      lastCheck: Date.now(),
      isOnline,
      responseTime,
    });

    return isOnline;
  } catch (error) {
    cdnStatusCache.set(provider.name, {
      lastCheck: Date.now(),
      isOnline: false,
      responseTime: Infinity,
    });

    return false;
  }
};

/**
 * 获取可用的 CDN 提供商
 * @returns {Promise<object>} 第一个可用的 CDN 提供商
 */
const getAvailableCDN = async () => {
  const region = getUserRegion();
  const providers = selectCDNProviders(region);

  for (const provider of providers) {
    if (await checkCDNHealth(provider)) {
      return provider;
    }
  }

  // 所有 CDN 都不可用，返回默认的
  return providers[0] || CDN_PROVIDERS.WESERV;
};

/**
 * 代理图片 URL
 * @param {string} imageUrl - 原始图片 URL
 * @param {object} options - 代理选项
 *   - width: 图片宽度
 *   - height: 图片高度
 *   - quality: 图片质量 (1-100)
 *   - format: 输出格式 (webp, png, jpg)
 *   - useFallback: 是否使用备选方案
 * @returns {Promise<string>} 代理后的 URL
 */
export const proxyImage = async (imageUrl, options = {}) => {
  // 验证输入
  if (!imageUrl) {
    console.warn('[CDN Proxy] 图片 URL 为空');
    return '';
  }

  // 本地资源不代理
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
    return imageUrl;
  }

  try {
    // 如果禁用了代理，直接返回原 URL
    if (!CONFIG.FEATURES.CDN_PROXY_ENABLED && !options.useFallback) {
      return imageUrl;
    }

    // 获取可用的 CDN 提供商
    const cdn = await getAvailableCDN();

    // 构建代理 URL
    const params = new URLSearchParams({
      url: imageUrl,
      ...(options.width && { w: options.width }),
      ...(options.height && { h: options.height }),
      ...(options.quality && { q: Math.min(100, Math.max(1, options.quality)) }),
      ...(options.format && { f: options.format }),
      ...(options.trim && { trim: options.trim }),
      ...(options.bg && { bg: options.bg }),
    });

    const proxiedUrl = `${cdn.url}?${params.toString()}`;
    console.debug('[CDN Proxy] 代理 URL:', { original: imageUrl, proxied: proxiedUrl });

    return proxiedUrl;
  } catch (error) {
    console.error('[CDN Proxy] 代理失败:', error);
    return imageUrl; // 降级到原 URL
  }
};

/**
 * 批量代理图片 URL
 * @param {Array<string>} imageUrls - 图片 URL 列表
 * @param {object} options - 代理选项
 * @returns {Promise<Array<string>>} 代理后的 URL 列表
 */
export const proxyImages = async (imageUrls, options = {}) => {
  if (!Array.isArray(imageUrls)) {
    return [];
  }

  return Promise.all(
    imageUrls.map(url => proxyImage(url, options))
  );
};

/**
 * 获取可访问的 QR 码生成 URL
 * @param {string} text - QR 码内容
 * @param {object} options - QR 码选项
 * @returns {Promise<string>} QR 码 API URL
 */
export const getAccessibleQRCodeUrl = async (text, options = {}) => {
  if (!text) return '';

  try {
    // 优先使用配置的 API
    if (CONFIG.API.QR_CODE) {
      return `${CONFIG.API.QR_CODE}?size=${options.size || '200'}&data=${encodeURIComponent(text)}`;
    }

    // 尝试获取可用的 QR 码服务
    const qrApis = [
      'https://api.qrserver.com/v1/create-qr-code/',
      'https://goqr.me/api/',
    ];

    for (const api of qrApis) {
      try {
        const response = await fetch(api, { method: 'HEAD', mode: 'no-cors' });
        if (response.ok || response.status === 0) {
          // status === 0 表示 CORS 请求成功
          return `${api}?size=${options.size || '200'}&data=${encodeURIComponent(text)}`;
        }
      } catch (e) {
        // 继续尝试下一个 API
      }
    }

    // 所有 API 都失败，返回默认的
    return `${qrApis[0]}?size=${options.size || '200'}&data=${encodeURIComponent(text)}`;
  } catch (error) {
    console.error('[CDN Proxy] QR 码 URL 生成失败:', error);
    return '';
  }
};

/**
 * 验证图片是否可访问
 * @param {string} imageUrl - 图片 URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>} 是否可访问
 */
export const verifyImageUrl = async (imageUrl, timeout = 5000) => {
  if (!imageUrl) return false;

  try {
    // 本地资源视为可访问
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
      return true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(imageUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // CORS 请求的 HEAD 可能返回 0 状态码
    return response.ok || response.status === 0;
  } catch (error) {
    return false;
  }
};

/**
 * CDN 状态报告（调试用）
 * @returns {object} 各个 CDN 服务的状态
 */
export const getCDNStatusReport = () => {
  const report = {};

  for (const [name, provider] of Object.entries(CDN_PROVIDERS)) {
    const cached = cdnStatusCache.get(provider.name);
    report[name] = {
      provider: provider.name,
      region: provider.region,
      reliability: provider.reliability,
      ...cached,
    };
  }

  return report;
};

export default {
  proxyImage,
  proxyImages,
  getAccessibleQRCodeUrl,
  verifyImageUrl,
  getCDNStatusReport,
  getAvailableCDN,
};

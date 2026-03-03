/**
 * 应用全局配置管理
 * 集中管理所有 API 端点、CDN、外部链接
 * 支持环境变量覆盖，提供默认值降级
 */

// ==========================================
// API 端点配置
// ==========================================

/**
 * API 服务基础 URL
 * 优先级：环境变量 > 默认值
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://data.tanshilong.com/api';

/**
 * 分享服务 API
 * 用于：模板短链接生成与存储
 */
const API_SHARE = import.meta.env.VITE_SHARE_API_URL || `${API_BASE_URL}/share`;

/**
 * AI 词条生成服务 API
 * 用于：AI 驱动的词条扩展功能
 */
const API_AI = import.meta.env.VITE_AI_API_URL || `${API_BASE_URL}/ai/process`;

/**
 * 数据云端同步地址
 * 用于：模板和词库的云端版本检查
 */
const DATA_CLOUD_URL = import.meta.env.VITE_DATA_CLOUD_URL || 'https://data.tanshilong.com/data';

// ==========================================
// CDN 和资源配置
// ==========================================

/**
 * QR 码生成服务
 * 主：QRServer | 备选：GoQR 或本地库
 */
const QR_CODE_API = import.meta.env.VITE_QR_API_URL || 'https://api.qrserver.com/v1/create-qr-code/';

const QR_CODE_FALLBACK = 'https://goqr.me/api/';

/**
 * 图片代理服务（用于跨域图片访问）
 * 主：weserv.nl (全球) | 备选：bgkill.com (国内友好)
 */
const IMAGE_PROXY_URL = import.meta.env.VITE_IMAGE_PROXY_URL || 'https://images.weserv.nl/';

const IMAGE_PROXY_FALLBACK = 'https://images.bgkill.com/';

/**
 * 模板资源 CDN 前缀
 * 用于：模板预览图、视频资源等
 */
const CDN_PREFIX = import.meta.env.VITE_CDN_PREFIX || 'https://cdn.tanshilong.com/';

// ==========================================
// 应用配置
// ==========================================

/**
 * 官网 URL（用于分享、导出和跳转链接）
 */
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://aipromptfill.com';

/**
 * GitHub 仓库
 */
// GitHub repo link removed per user request
const GITHUB_REPO = '';

/**
 * 赞赏支持链接
 */
const SUPPORT_LINK = 'https://data.tanshilong.com/support';

/**
 * 功能开关
 */
const FEATURES = {
  AI_ENABLED: import.meta.env.VITE_FEATURE_AI_ENABLED !== 'false',
  SHARE_ENABLED: import.meta.env.VITE_FEATURE_SHARE_ENABLED !== 'false',
  IMAGE_LAZY_LOAD: true,
  CDN_PROXY_ENABLED: true,
};

// ==========================================
// 导出配置对象
// ==========================================

const CONFIG = {
  // API 端点
  API: {
    BASE: API_BASE_URL,
    SHARE: API_SHARE,
    AI: API_AI,
    DATA_CLOUD: DATA_CLOUD_URL,
  },

  // CDN 和资源
  CDN: {
    PREFIX: CDN_PREFIX,
    QR_CODE: QR_CODE_API,
    QR_CODE_FALLBACK,
    IMAGE_PROXY: IMAGE_PROXY_URL,
    IMAGE_PROXY_FALLBACK,
  },

  // 应用配置
  APP: {
    PUBLIC_URL,
    GITHUB_REPO,
    SUPPORT_LINK,
  },

  // 功能开关
  FEATURES,

  // 应用版本
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // 日志级别
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
};

// ==========================================
// 工具函数
// ==========================================

/**
 * 获取 CDN URL
 * @param {string} path - 资源相对路径
 * @param {string} fallback - 降级 URL
 * @returns {string} 完整 CDN URL
 */
export const getCDNUrl = (path, fallback = '') => {
  if (!path) return fallback;
  const url = `${CONFIG.CDN.PREFIX}${path}`;
  return url;
};

/**
 * 获取代理的图片 URL
 * @param {string} imageUrl - 原始图片 URL
 * @param {object} options - 代理选项
 * @returns {string} 代理后的 URL
 */
export const getProxiedImageUrl = (imageUrl, options = {}) => {
  if (!imageUrl || !CONFIG.FEATURES.CDN_PROXY_ENABLED) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    // 对于本地资源或数据 URL，不代理
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // 构建代理 URL
    const params = new URLSearchParams({
      url: imageUrl,
      ...(options.w && { w: options.w }), // 宽度
      ...(options.h && { h: options.h }), // 高度
      ...(options.q && { q: options.q }), // 质量
      ...(options.f && { f: options.f }), // 格式
    });

    return `${CONFIG.CDN.IMAGE_PROXY}?${params.toString()}`;
  } catch (error) {
    console.warn('[Config] 图片代理 URL 构建失败:', error.message);
    return imageUrl;
  }
};

/**
 * 获取 QR 码生成 API URL
 * @param {string} text - QR 码内容
 * @param {object} options - QR 码选项
 * @returns {string} QR 码 API URL
 */
export const getQRCodeUrl = (text, options = {}) => {
  if (!text) return '';

  const params = new URLSearchParams({
    size: options.size || '200x200',
    format: options.format || 'png',
    margin: options.margin || '0',
    ...(options.errorCorrection && { qzone: options.errorCorrection }),
  });

  return `${CONFIG.CDN.QR_CODE}?${params.toString()}&data=${encodeURIComponent(text)}`;
};

/**
 * 验证配置完整性
 * @returns {object} 配置验证结果
 */
export const validateConfig = () => {
  const warnings = [];
  const errors = [];

  // 检查关键 API
  if (!CONFIG.API.BASE) errors.push('API 基础 URL 未配置');
  if (!CONFIG.CDN.PREFIX) warnings.push('CDN 前缀未配置，模板资源加载可能失败');

  // 检查功能依赖
  if (CONFIG.FEATURES.AI_ENABLED && !CONFIG.API.AI) {
    warnings.push('AI 功能已启用但 API 端点未配置');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * 打印配置信息（调试用）
 */
export const printConfigInfo = () => {
  if (CONFIG.LOG_LEVEL === 'debug') {
    console.log('[Config] 应用配置信息:');
    console.table(CONFIG);
  }
};

// 应用启动时验证配置
if (import.meta.env.DEV) {
  const validation = validateConfig();
  if (validation.errors.length > 0) {
    console.error('[Config] 配置错误:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('[Config] 配置警告:', validation.warnings);
  }
}

export default CONFIG;

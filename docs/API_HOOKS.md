# PromptFill Hook API 完整文档

本文档详细记录所有自定义 Hook 的 API、参数、返回值和使用示例。

---

## 目录

1. [useShareFunctions](#usesharefunctions) - 模板分享和短链功能
2. [useImageExport](#useimageexport) - 图片导出功能
3. [useDataSync](#usedatasync) - 数据同步和版本管理
4. [useLocalStorage](#uselocalstorage) - 本地存储(IndexedDB)
5. [useDarkMode](#usedarkmode) - 暗色模式切换
6. [其他 Hook](#其他hook)

---

## useShareFunctions

**位置**: `src/hooks/useShareFunctions.js`

**功能**: 提供模板分享、短链生成、分享链接解析等功能

### 参数

```javascript
{
  // 模板相关
  activeTemplate: Object,        // 当前活跃的模板对象
  activeTemplateId: String,      // 模板 ID
  banks: Array,                  // 词库列表
  categories: Array,             // 分类列表
  language: String,              // 当前语言 ('cn' | 'en')
  
  // 回调函数
  getShortCodeFromServer: Fn,    // 从服务器获取短码的函数
  setNoticeMessage: Fn,          // 设置提示消息的回调
}
```

### 返回值

返回对象包含以下方法和状态：

```javascript
{
  // 状态
  shareData: String,             // 分享数据（已压缩）
  shareUrl: String,              // 完整分享链接
  shortShareUrl: String,         // 短分享链接
  isGenerating: Boolean,         // 是否正在生成短链
  
  // 方法
  generateShareData: Fn,         // 生成分享数据
  updateShareData: Fn,           // 更新分享数据
  generateShareUrl: Fn,          // 生成分享链接
  getShareUrl: Fn,               // 获取分享链接（异步）
  generateShortUrl: Fn,          // 生成短链（异步）
  importFromShareUrl: Fn,        // 从分享 URL 导入模板
  copyShareUrl: Fn,              // 复制分享链接到剪贴板
  copyShortShareUrl: Fn,         // 复制短链到剪贴板
  parseShareData: Fn,            // 解析分享数据
}
```

### 使用示例

```javascript
import { useShareFunctions } from '../hooks/useShareFunctions';

function MyComponent() {
  const {
    shareUrl,
    shortShareUrl,
    generateShortUrl,
    copyShareUrl,
    importFromShareUrl,
  } = useShareFunctions({
    activeTemplate,
    activeTemplateId,
    banks,
    categories,
    language,
    getShortCodeFromServer,
    setNoticeMessage,
  });

  const handleShare = async () => {
    await generateShortUrl();
    await copyShareUrl();
  };

  return (
    <div>
      <button onClick={handleShare}>分享</button>
      <input value={shortShareUrl} readOnly />
    </div>
  );
}
```

---

## useImageExport

**位置**: `src/hooks/useImageExport.js`

**功能**: 将模板卡片导出为高分辨率图片

### 参数

```javascript
{
  activeTemplate: Object,              // 当前模板
  activeTemplateId: String,            // 模板 ID
  banks: Array,                        // 词库列表
  categories: Array,                   // 分类列表
  language: String,                    // 语言
  INITIAL_TEMPLATES_CONFIG: Object,    // 模板配置
  getShortCodeFromServer: Fn,          // 获取短码函数
  setNoticeMessage: Fn,                // 提示消息回调
}
```

### 返回值

```javascript
{
  isExporting: Boolean,        // 是否正在导出
  handleExportImage: Fn,       // 执行导出的函数
  preCacheImage: Fn,           // 预缓存图片的函数
}
```

### 使用示例

```javascript
import { useImageExport } from '../hooks/useImageExport';

function ExportButton() {
  const { isExporting, handleExportImage } = useImageExport({
    activeTemplate,
    activeTemplateId,
    banks,
    categories,
    language,
    INITIAL_TEMPLATES_CONFIG,
    getShortCodeFromServer,
    setNoticeMessage,
  });

  return (
    <button 
      onClick={handleExportImage} 
      disabled={isExporting}
    >
      {isExporting ? '导出中...' : '导出为图片'}
    </button>
  );
}
```

---

## useDataSync

**位置**: `src/hooks/useDataSync.js`

**功能**: 在应用启动时同步云端数据和本地数据，检查版本更新

### 参数

```javascript
{
  lastAppliedDataVersion: String,      // 上次应用的数据版本
  SYSTEM_DATA_VERSION: String,         // 系统数据版本
  
  // 状态设置函数
  setTemplates: Fn,
  setBanks: Fn,
  setDefaults: Fn,
  setCategories: Fn,
  setLastAppliedDataVersion: Fn,
}
```

### 功能说明

- 并行检查云端 (`CONFIG.API.DATA_CLOUD`) 和本地 (`/data`) 数据源
- 自动选择最新版本的数据
- 版本更新时自动应用新数据
- 降级处理：如果云端不可用，使用本地数据

### 使用示例

```javascript
import { useDataSync } from '../hooks/useDataSync';

function App() {
  const [templates, setTemplates] = useState([]);
  const [banks, setBanks] = useState([]);
  
  useDataSync({
    lastAppliedDataVersion,
    SYSTEM_DATA_VERSION,
    setTemplates,
    setBanks,
    setDefaults,
    setCategories,
    setLastAppliedDataVersion,
  });

  // 数据会自动同步和更新
  return <div>{templates.length} templates loaded</div>;
}
```

---

## useLocalStorage

**位置**: `src/hooks/useLocalStorage.js`

**功能**: 使用 IndexedDB 实现大容量本地存储（超过 5MB 限制）

### 用法

```javascript
import { useLocalStorage } from '../hooks/useLocalStorage';

function MyComponent() {
  // 读取数据
  const data = useLocalStorage('key');
  
  // 保存数据（自动处理大对象）
  useLocalStorage.set('key', largeObject);
  
  // 删除数据
  useLocalStorage.remove('key');
  
  // 清空所有
  useLocalStorage.clear();
}
```

---

## useDarkMode

**位置**: `src/hooks/useDarkMode.js`

**功能**: 管理暗色模式状态和主题切换

### 返回值

```javascript
{
  isDarkMode: Boolean,    // 当前是否为暗色模式
  toggleDarkMode: Fn,     // 切换暗色模式
}
```

### 使用示例

```javascript
function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  return (
    <button onClick={toggleDarkMode}>
      {isDarkMode ? '☀️ 亮色' : '🌙 暗色'}
    </button>
  );
}
```

---

## 其他 Hook

### useWindowSize

**功能**: 监听窗口大小变化

```javascript
const { width, height } = useWindowSize();
```

### useDebounce

**功能**: 防抖值

```javascript
const debouncedValue = useDebounce(value, 500);
```

### useMount

**功能**: 在组件挂载时执行回调

```javascript
useMount(() => {
  console.log('Component mounted');
});
```

---

## 配置常量

所有 API 端点和 CDN 资源都通过 `src/constants/config.js` 统一管理：

```javascript
import CONFIG from '../constants/config.js';

// API 端点
CONFIG.API.SHARE           // 分享服务
CONFIG.API.AI              // AI 生成服务
CONFIG.API.DATA_CLOUD      // 数据同步源

// CDN 资源
CONFIG.CDN.PREFIX          // CDN 前缀
CONFIG.CDN.IMAGE_PROXY     // 图片代理服务
CONFIG.CDN.QR_CODE         // QR 码生成

// 应用链接
CONFIG.APP.PUBLIC_URL      // 官网 URL
CONFIG.APP.GITHUB_REPO     // GitHub 仓库
CONFIG.APP.SUPPORT_LINK    // 赞赏支持链接
```

---

## CDN 代理工具函数

**位置**: `src/utils/cdnProxy.js`

### 函数列表

```javascript
import * as cdnProxy from '../utils/cdnProxy.js';

// 代理单个图片
const proxiedUrl = await cdnProxy.proxyImage(imageUrl, {
  width: 200,
  height: 150,
  quality: 85,
  format: 'webp'
});

// 批量代理
const proxiedUrls = await cdnProxy.proxyImages(urls, options);

// 获取可访问的 QR 码 URL
const qrUrl = await cdnProxy.getAccessibleQRCodeUrl(text, {
  size: 200
});

// 验证图片 URL 是否可访问
const isAccessible = await cdnProxy.verifyImageUrl(imageUrl);

// 获取 CDN 状态报告（调试）
const report = cdnProxy.getCDNStatusReport();
```

---

## LazyImage 组件

**位置**: `src/components/LazyImage.jsx`

**功能**: 图片懒加载、CDN 代理、格式转换、错误处理

### Props

```javascript
<LazyImage
  src="https://example.com/image.jpg"        // 图片 URL（必需）
  alt="描述"                                   // 描述文本（必需）
  width={200}                                 // 宽度（可选）
  height={150}                                // 高度（可选）
  quality={85}                                // 压缩质量 1-100（默认: 85）
  format="webp"                               // 输出格式（默认: webp）
  placeholder="color"                         // 占位符类型：color|blur|none
  placeholderColor="#f0f0f0"                  // 占位符颜色
  useProxy={true}                             // 是否使用 CDN 代理（默认: true）
  useLazyLoad={true}                          // 是否启用懒加载（默认: true）
  onLoad={(event) => {}}                      // 加载完成回调
  onError={(event) => {}}                     // 加载失败回调
/>
```

### 使用示例

```javascript
import LazyImage from '../components/LazyImage';

function ImageGallery() {
  return (
    <div>
      <LazyImage
        src="https://example.com/image1.jpg"
        alt="图片 1"
        width={300}
        height={200}
        quality={80}
        placeholder="blur"
      />
    </div>
  );
}
```

---

## 环境变量

在 `.env` 或 `.env.local` 中配置：

```env
# API 端点
VITE_SHARE_API_URL=https://your-api.com/api/share
VITE_AI_API_URL=https://your-api.com/api/ai/process
VITE_DATA_CLOUD_URL=https://your-api.com/data

# 应用配置
VITE_PUBLIC_URL=https://your-app.com

# CDN
VITE_IMAGE_PROXY_URL=https://images.weserv.nl/
VITE_CDN_PREFIX=https://cdn.example.com/

# 功能开关
VITE_FEATURE_AI_ENABLED=true
VITE_FEATURE_SHARE_ENABLED=true

# 日志级别
VITE_LOG_LEVEL=info
```

---

## 常见问题

### 如何修改 API 端点？

1. 修改 `.env` 或 `.env.local`：
   ```env
   VITE_SHARE_API_URL=https://your-api.com/api/share
   ```

2. 或直接修改 `src/constants/config.js`：
   ```javascript
   const API_SHARE = 'https://your-api.com/api/share';
   ```

### 如何禁用某个功能？

在 `.env` 中设置：
```env
VITE_FEATURE_AI_ENABLED=false
```

### 图片懒加载不工作？

检查浏览器是否支持 IntersectionObserver API（现代浏览器都支持）。

---

## 更新日志

- **v1.0.0** (2024-03-xx)
  - 创建集中配置管理系统
  - 添加 CDN 代理和智能备选方案
  - 创建 LazyImage 懒加载组件
  - 编写完整 Hook API 文档

---

**最后更新**: 2024-03-xx
**维护者**: PromptFill Team

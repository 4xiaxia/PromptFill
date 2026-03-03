# 环境变量配置指南

本文档详细说明 PromptFill 项目的所有环境变量配置方法与使用场景。

## 快速开始

### 方案 1: 本地开发（推荐 - 无配置）

```bash
# 1. 克隆项目
git clone https://github.com/TanShilongMario/PromptFill.git
cd PromptFill

# 2. 安装依赖
npm install

# 3. 直接启动（无需配置 .env）
npm run dev
```

✅ **优点**: 开箱即用，使用内置默认值  
✅ **已启用功能**: 本地存储、模板编辑、长链接分享  
❌ **禁用功能**: 短链接分享（自动降级）、AI 词条生成  

### 方案 2: 使用自建后端

```bash
# 1. 复制配置模板
cp .env.example .env

# 2. 编辑 .env，填入你的 API 地址
VITE_SHARE_API_URL=https://your-api.com/api/share
VITE_AI_API_URL=https://your-api.com/api/ai/process

# 3. 启动开发服务器
npm run dev
```

✅ **优点**: 完整功能、支持私有部署  
⚠️ **前置条件**: 需要自建后端服务器  

---

## 详细配置说明

### 1. 后端服务配置

#### 1.1 分享服务 API (`VITE_SHARE_API_URL`)

**用途**: 生成短链接、存储分享模板数据

**默认值**:
```
https://data.tanshilong.com/api/share
```

**自定义配置示例**:
```env
# 本地测试
VITE_SHARE_API_URL=http://localhost:3000/api/share

# 公司内网
VITE_SHARE_API_URL=https://api.internal.company.com/api/share

# 云端服务
VITE_SHARE_API_URL=https://api.example.com/api/share
```

**API 签名规范** (如果自建):
```javascript
// POST /api/share
// 请求体
{
  "data": "compressed_template_data",  // pako 压缩后的 JSON
  "metadata": {
    "title": "Template Title",
    "timestamp": 1234567890
  }
}

// 响应
{
  "code": 200,
  "data": {
    "shortCode": "abc123",  // 短码，用于分享链接
    "shortUrl": "https://example.com/s/abc123"
  }
}
```

#### 1.2 AI 服务 API (`VITE_AI_API_URL`)

**用途**: 生成 AI 词条、提示词扩展

**默认值**:
```
https://data.tanshilong.com/api/ai/process
```

**自定义配置示例**:
```env
# 使用自建 AI 服务
VITE_AI_API_URL=https://your-llm-api.com/v1/completions

# 使用商用 API (需二次开发)
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
```

**API 签名规范** (如果自建):
```javascript
// POST /api/ai/process
// 请求体
{
  "action": "generate_terms",
  "variableLabel": "color",
  "language": "cn",
  "context": "...prompt template content...",
  "count": 5
}

// 响应
{
  "code": 200,
  "data": {
    "terms": [
      "红色的",
      "蓝色的",
      "绿色的"
    ]
  }
}
```

#### 1.3 数据云端同步 (`VITE_DATA_CLOUD_URL`)

**用途**: 检查官方模板和词库的最新版本

**默认值**:
```
https://data.tanshilong.com/data
```

**配置示例**:
```env
VITE_DATA_CLOUD_URL=https://api.example.com/data
```

**API 签名规范** (如果自建):
```javascript
// GET /data/version
// 响应
{
  "code": 200,
  "data": {
    "appVersion": "0.9.2",
    "dataVersion": "0.9.2",
    "templates": "https://...",
    "banks": "https://..."
  }
}
```

---

### 2. 应用配置

#### 2.1 官网 URL (`VITE_PUBLIC_URL`)

**用途**: 分享链接、导出图片中的网址、跳转链接

**默认值**:
```
https://aipromptfill.com
```

**自定义配置示例**:
```env
# 生产环境
VITE_PUBLIC_URL=https://aipromptfill.com

# 测试环境
VITE_PUBLIC_URL=https://test.example.com

# 本地开发
VITE_PUBLIC_URL=http://localhost:5173
```

**影响的功能**:
- ✅ 分享链接的基础 URL
- ✅ 导出长图中的二维码目标
- ✅ "返回首页" 链接

---

### 3. CDN 和资源配置

#### 3.1 QR 码生成服务 (`VITE_QR_API_URL`)

**用途**: 生成二维码（用于分享和导出）

**默认值**:
```
https://api.qrserver.com/v1/create-qr-code/
```

**备选方案**:
```env
# 备选 1：GoQR
VITE_QR_API_URL=https://goqr.me/api/

# 备选 2：本地实现（需集成 qrcode.js）
# VITE_QR_API_URL=local://qrcode
```

**API 格式** (第三方):
```
https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={ENCODED_URL}
```

#### 3.2 图片代理服务 (`VITE_IMAGE_PROXY_URL`)

**用途**: 跨域访问图片（避免 CORS 错误）

**默认值**:
```
https://images.weserv.nl/
```

**备选方案**:
```env
# 国内友好的代理
VITE_IMAGE_PROXY_URL=https://images.bgkill.com/

# 自建代理（需部署）
VITE_IMAGE_PROXY_URL=https://proxy.example.com/
```

**用法示例** (代码中自动使用):
```javascript
// 代理 URL
const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;
```

#### 3.3 CDN 前缀 (`VITE_CDN_PREFIX`)

**用途**: 模板预览图、视频资源的 CDN 前缀（可选）

**默认值**:
```
（无，使用绝对 URL）
```

**配置示例**:
```env
# 使用自建 CDN
VITE_CDN_PREFIX=https://cdn.example.com/assets/

# 使用云服务商 CDN
VITE_CDN_PREFIX=https://d.example.cloudflare.com/
```

**注意**: 此配置仅在需要统一替换资源 URL 时使用

---

## 部署场景配置

### 📱 本地开发环境

```env
# .env (本地开发)
# 保持为空，使用所有默认值
```

✅ 启用功能：本地存储、模板编辑、预览、长链接分享  
❌ 禁用功能：短链接、AI 词条

### 🧪 测试环境

```env
# .env.test
VITE_SHARE_API_URL=https://test-api.example.com/api/share
VITE_AI_API_URL=https://test-api.example.com/api/ai/process
VITE_PUBLIC_URL=https://test.example.com
```

### 🚀 生产环境 (Vercel)

```env
# 在 Vercel 项目设置中添加以下环境变量

# 后端服务
VITE_SHARE_API_URL=https://api.example.com/api/share
VITE_AI_API_URL=https://api.example.com/api/ai/process
VITE_DATA_CLOUD_URL=https://api.example.com/data

# 应用配置
VITE_PUBLIC_URL=https://aipromptfill.com

# CDN 和资源
VITE_QR_API_URL=https://api.qrserver.com/v1/create-qr-code/
VITE_IMAGE_PROXY_URL=https://images.weserv.nl/
```

### 🐳 Docker 部署

```bash
# Dockerfile 中
ENV VITE_SHARE_API_URL=https://api.example.com/api/share
ENV VITE_AI_API_URL=https://api.example.com/api/ai/process
ENV VITE_PUBLIC_URL=https://aipromptfill.com

# 或使用 docker run
docker run -e VITE_SHARE_API_URL=... promptfill:latest
```

### 🖥️ Tauri 桌面应用

```javascript
// src-tauri/tauri.conf.json
{
  "env": {
    "VITE_SHARE_API_URL": "https://api.example.com/api/share",
    "VITE_AI_API_URL": "https://api.example.com/api/ai/process"
  }
}
```

---

## 检查清单

### 初次部署前

- [ ] 复制 `.env.example` 为 `.env`
- [ ] 填写所有必需的 API 地址
- [ ] 测试 API 连接是否正常
- [ ] 确认官网 URL 正确
- [ ] 验证 CDN 代理服务可用

### 部署后验证

```bash
# 1. 检查环境变量是否正确加载
npm run build

# 2. 验证分享功能
# 在应用中生成一个分享链接，检查短链接是否正常工作

# 3. 验证 AI 功能（如启用）
# 尝试使用 AI 词条生成功能

# 4. 检查日志
# 浏览器控制台应无相关错误
```

---

## 常见问题

### Q1: 如何在本地测试短链接分享？

```bash
# 启动本地后端 Mock 服务器
# 1. 创建 mock-server.js
const express = require('express');
const app = express();

app.post('/api/share', (req, res) => {
  res.json({
    code: 200,
    data: {
      shortCode: 'test123',
      shortUrl: 'http://localhost:5173/s/test123'
    }
  });
});

app.listen(3000);

# 2. 在 .env 中配置
VITE_SHARE_API_URL=http://localhost:3000/api/share

# 3. 启动服务
node mock-server.js &
npm run dev
```

### Q2: 如何禁用 AI 功能？

```bash
# 在 .env 中留空 AI 相关配置
# VITE_AI_API_URL= (留空)

# 或在代码中检查
if (!import.meta.env.VITE_AI_API_URL) {
  // AI 功能禁用
}
```

### Q3: 图片代理失败怎么办？

```bash
# 尝试备选代理服务
VITE_IMAGE_PROXY_URL=https://images.bgkill.com/

# 或自建代理（参考 Dockerfile）
```

### Q4: 如何在 CI/CD 中动态注入环境变量？

```bash
# GitHub Actions 示例
- name: Build
  env:
    VITE_SHARE_API_URL: ${{ secrets.API_URL }}
    VITE_AI_API_URL: ${{ secrets.AI_API_URL }}
  run: npm run build
```

---

## 相关文档

- 📄 [README.md](../README.md) - 项目概览
- 📄 [BLUEPRINT.md](../BLUEPRINT.md) - 架构设计
- 🔧 [Vercel 部署指南](./DEPLOYMENT.md) - 生产环境部署

---

**最后更新**: 2026-03-02

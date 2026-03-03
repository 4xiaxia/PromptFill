# PromptFill 数据流和架构文档

本文档使用 Mermaid 图表展示应用的数据流、架构层级和关键流程。

---

## 目录

1. [应用整体架构](#应用整体架构)
2. [数据流向图](#数据流向图)
3. [用户操作流程](#用户操作流程)
4. [模板分享流程](#模板分享流程)
5. [图片导出流程](#图片导出流程)
6. [组件层级关系](#组件层级关系)
7. [数据存储方案](#数据存储方案)
8. [API 集成架构](#api-集成架构)

---

## 应用整体架构

```mermaid
graph TB
    subgraph Frontend["前端应用 (React + Vite)"]
        App["App.jsx<br/>主应用入口"]
        Components["55 个功能组件<br/>- 模态框(8)<br/>- 侧边栏(5)<br/>- 图标(20+)"]
        Hooks["自定义 Hooks (9)<br/>- useShareFunctions<br/>- useImageExport<br/>- useDataSync"]
        Utils["工具函数库<br/>- helpers.js<br/>- cdnProxy.js<br/>- platform.js"]
        Constants["配置管理<br/>- config.js<br/>- templates.js<br/>- banks.js"]
    end

    subgraph Storage["数据存储"]
        IndexedDB["IndexedDB<br/>大容量本地存储<br/>支持 > 5MB"]
        LocalStorage["LocalStorage<br/>简单数据"]
        SessionStorage["SessionStorage<br/>会话数据"]
    end

    subgraph Backend["后端服务"]
        ShareAPI["分享服务<br/>POST /api/share<br/>获取短码"]
        AIAPI["AI 生成<br/>POST /api/ai/process<br/>词条扩展"]
        DataCloud["数据同步<br/>GET /data<br/>版本管理"]
    end

    subgraph CDN["CDN & 资源"]
        WeServ["weserv.nl<br/>图片代理<br/>全球可用"]
        BgKill["bgkill.com<br/>图片代理<br/>国内优化"]
        QRCode["QR 码服务<br/>api.qrserver.com<br/>goqr.me"]
    end

    App --> Components
    App --> Hooks
    App --> Constants
    Components --> Utils
    Hooks --> Utils
    Utils --> Storage
    Utils --> Backend
    Utils --> CDN
    Hooks --> Backend
```

---

## 数据流向图

```mermaid
graph LR
    User["👤 用户操作"]
    UI["🎨 UI 组件"]
    State["📊 React State"]
    Hooks["🪝 自定义 Hooks"]
    LocalDB["💾 IndexedDB"]
    API["🌐 API 调用"]
    Server["🖥️ 后端服务"]
    CDN["📦 CDN 资源"]

    User -->|交互| UI
    UI -->|更新| State
    State -->|读取| Hooks
    Hooks -->|本地操作| LocalDB
    Hooks -->|网络请求| API
    API -->|转发| Server
    Server -->|返回数据| API
    API -->|更新| State
    CDN -->|加载资源| UI
    Hooks -->|加载资源| CDN
```

---

## 用户操作流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 页面 UI
    participant Hooks as 自定义 Hooks
    participant LocalDB as 本地存储
    participant API as API 接口
    participant Server as 后端服务

    User->>UI: 1. 选择模板/词库
    UI->>Hooks: 2. 触发状态更新
    Hooks->>LocalDB: 3. 保存本地数据
    LocalDB-->>Hooks: 4. 返回确认
    Hooks-->>UI: 5. 更新显示
    UI-->>User: 6. 显示更新结果

    User->>UI: 7. 点击分享
    UI->>Hooks: 8. 调用 useShareFunctions
    Hooks->>API: 9. 发送分享数据
    API->>Server: 10. 生成短码
    Server-->>API: 11. 返回短码
    API-->>Hooks: 12. 返回分享链接
    Hooks-->>UI: 13. 更新分享链接
    UI-->>User: 14. 显示分享链接
```

---

## 模板分享流程

```mermaid
graph TD
    A["用户点击分享"] --> B["compressTemplate<br/>压缩模板数据"]
    B --> C["生成 share 参数"]
    C --> D{是否需要<br/>短链?}
    D -->|是| E["调用 getShortCodeFromServer"]
    D -->|否| F["使用长链接"]
    E --> G["POST /api/share<br/>发送压缩数据"]
    G --> H["服务器生成短码"]
    H --> I["返回短码"]
    I --> J["生成短链接"]
    F --> J
    J --> K["copyToClipboard<br/>复制到剪贴板"]
    K --> L["显示分享成功提示"]
    L --> M["用户分享链接"]
```

---

## 图片导出流程

```mermaid
graph TD
    A["用户点击导出"] --> B["setIsExporting = true"]
    B --> C["获取预览卡片元素"]
    C --> D["图片预缓存<br/>preCacheImage"]
    D --> E{是否有<br/>短码?}
    E -->|是| F["使用短链作为水印"]
    E -->|否| G["使用长链作为水印"]
    F --> H["生成 QR 码"]
    G --> H
    H --> I["调用 html2canvas<br/>渲染页面为图片"]
    I --> J{是否为<br/>Tauri?}
    J -->|是| K["使用 Tauri API<br/>下载图片"]
    J -->|否| L["使用浏览器<br/>下载图片"]
    K --> M["显示导出成功"]
    L --> M
    M --> N["setIsExporting = false"]
```

---

## 组件层级关系

```mermaid
graph TB
    App["App.jsx<br/>主应用"]
    
    App --> Layout["Layout 布局"]
    App --> Preview["Preview 预览"]
    App --> Modals["模态框集群"]
    
    Layout --> Sidebar["BanksSidebar<br/>词库侧边栏"]
    Layout --> MainPanel["主面板<br/>Tab 导航"]
    
    MainPanel --> TemplateTab["TemplateTab<br/>模板管理"]
    MainPanel --> PromptTab["PromptTab<br/>提示词编辑"]
    
    TemplateTab --> TemplateList["TemplateList"]
    PromptTab --> PromptEditor["PromptEditor"]
    
    Sidebar --> BankList["BankList<br/>词库列表"]
    Sidebar --> InsertModal["InsertVariableModal<br/>变量插入"]
    
    Preview --> PreviewCard["PreviewCard<br/>预览卡片"]
    PreviewCard --> VariableRenderer["VariableRenderer<br/>变量渲染"]
    
    Modals --> ShareModal["ShareModal<br/>分享"]
    Modals --> ExportModal["ExportModal<br/>导出"]
    Modals --> SettingsModal["SettingsModal<br/>设置"]
```

---

## 数据存储方案

```mermaid
graph LR
    Data["数据"] --> Decision1{数据<br/>大小}
    
    Decision1 -->|< 50KB| LS["LocalStorage<br/>JSON.stringify"]
    Decision1 -->|50KB - 5MB| SS["SessionStorage<br/>临时数据"]
    Decision1 -->|> 5MB| IDB["IndexedDB<br/>大容量存储"]
    
    LS --> Storage1["保存位置"]
    SS --> Storage1
    IDB --> Storage2["保存位置<br/>数据库表"]
    
    Storage1 --> Read1["读取方式<br/>JSON.parse"]
    Storage2 --> Read2["读取方式<br/>异步查询"]
    
    Read1 --> App
    Read2 --> App
    
    subgraph App["App 使用"]
        Templates["Templates<br/>~2.5MB"]
        Banks["Banks<br/>~3.2MB"]
        UserData["用户配置<br/>~0.5MB"]
    end
```

---

## API 集成架构

```mermaid
graph TB
    Frontend["前端应用"]
    
    Frontend -->|1. 发起请求| APIGateway["API 网关<br/>request interception"]
    APIGateway -->|2. 验证和转发| ShareAPI["分享服务<br/>/api/share"]
    APIGateway -->|3. 验证和转发| AIAPI["AI 服务<br/>/api/ai/process"]
    APIGateway -->|4. 验证和转发| DataAPI["数据同步<br/>/data"]
    
    ShareAPI -->|生成短码| Database1["数据库<br/>分享记录"]
    AIAPI -->|AI 模型| LLM["大语言模型<br/>OpenAI/Claude"]
    DataAPI -->|返回版本| DataStorage["文件存储<br/>version.json"]
    
    Database1 -->|返回| APIGateway
    LLM -->|返回| APIGateway
    DataStorage -->|返回| APIGateway
    
    APIGateway -->|5. 返回响应| Frontend
    
    Frontend -->|本地降级| LocalFallback["本地方案<br/>长链接/离线"]
```

---

## CDN 智能备选方案

```mermaid
graph TD
    A["加载图片"] --> B["检测用户地区"]
    B --> C{用户在<br/>中国?}
    
    C -->|是| D["优先使用<br/>bgkill.com"]
    C -->|否| E["优先使用<br/>weserv.nl"]
    
    D --> F["检测服务<br/>可用性"]
    E --> F
    
    F --> G{服务<br/>在线?}
    G -->|是| H["使用该服务<br/>加载图片"]
    G -->|否| I["尝试备选<br/>CDN"]
    
    I --> J{有备选<br/>可用?}
    J -->|是| K["使用备选<br/>CDN"]
    J -->|否| L["使用原始<br/>URL"]
    
    H --> M["返回代理 URL"]
    K --> M
    L --> M
    
    M --> N["加载图片"]
```

---

## 应用生命周期

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant App as React App
    participant Sync as useDataSync Hook
    participant LocalDB as IndexedDB
    participant CloudAPI as Cloud API
    participant UI as UI 组件

    Browser->>App: 1. 加载页面
    App->>Sync: 2. 初始化数据同步
    Sync->>LocalDB: 3. 查询本地版本
    LocalDB-->>Sync: 4. 返回本地版本
    Sync->>CloudAPI: 5. 查询云端版本
    CloudAPI-->>Sync: 6. 返回云端版本
    Sync->>Sync: 7. 比较版本
    Sync->>LocalDB: 8. 更新到最新版本
    Sync->>App: 9. 返回同步结果
    App->>UI: 10. 初始化 UI
    UI-->>Browser: 11. 渲染页面
    Browser-->>Browser: 应用就绪
```

---

## 配置和环境变量流向

```mermaid
graph LR
    ENV[".env / .env.local<br/>环境变量文件"]
    CONFIG["config.js<br/>配置管理器"]
    HOOKS["Hooks 和 Utils<br/>使用配置"]
    COMPONENTS["组件<br/>展示数据"]
    
    ENV -->|import.meta.env| CONFIG
    CONFIG -->|export default CONFIG| HOOKS
    HOOKS -->|使用 API/CDN| COMPONENTS
    COMPONENTS -->|渲染 UI| Browser["浏览器"]
    
    subgraph ConfigVariables["关键配置变量"]
        API["API 端点<br/>VITE_SHARE_API_URL<br/>VITE_AI_API_URL"]
        CDN["CDN 资源<br/>VITE_IMAGE_PROXY_URL<br/>VITE_CDN_PREFIX"]
        APP["应用配置<br/>VITE_PUBLIC_URL"]
    end
    
    ENV -.-> ConfigVariables
    ConfigVariables -.-> CONFIG
```

---

## 错误处理和降级方案

```mermaid
graph TD
    A["执行操作"] --> B{操作<br/>成功?}
    
    B -->|是| C["返回成功"]
    B -->|否| D["捕获错误"]
    
    D --> E{错误<br/>类型?}
    
    E -->|网络错误| F["使用离线方案"]
    E -->|API 超时| G["自动重试"]
    E -->|版本冲突| H["同步最新版本"]
    E -->|其他错误| I["显示用户提示"]
    
    F --> J["本地长链接分享"]
    G --> K["重新发送请求"]
    H --> L["重新加载数据"]
    I --> M["记录错误日志"]
    
    J --> N["继续操作"]
    K --> N
    L --> N
    M --> N
```

---

## 性能优化层级

```mermaid
graph TB
    subgraph L1["第一层：代码分割"]
        Splitting["动态导入<br/>Route-based splitting"]
    end
    
    subgraph L2["第二层：缓存优化"]
        LocalCache["本地缓存<br/>IndexedDB"]
        ImageCache["图片缓存<br/>LazyImage"]
        DataCache["数据缓存<br/>useDataSync"]
    end
    
    subgraph L3["第三层：资源优化"]
        CDNProxy["CDN 代理<br/>图片压缩"]
        LazyLoad["懒加载<br/>IntersectionObserver"]
        WebP["现代格式<br/>WebP 优先"]
    end
    
    subgraph L4["第四层：运行时优化"]
        Memoize["Memoization<br/>useMemo/useCallback"]
        VirtualList["虚拟列表<br/>大数据集"]
        Debounce["防抖/节流<br/>事件处理"]
    end
    
    L1 --> Performance["整体性能<br/>提升"]
    L2 --> Performance
    L3 --> Performance
    L4 --> Performance
```

---

## 更新日志

- **v1.0.0** (2024-03-xx)
  - 完成应用整体架构设计
  - 绘制数据流向图
  - 记录所有主要流程
  - 文档化 CDN 智能方案

---

**最后更新**: 2024-03-xx
**维护者**: PromptFill Team

---

## 如何阅读本文档

1. **快速了解**: 先看"应用整体架构"和"数据流向图"
2. **深入某功能**: 查看对应的"流程图"（分享、导出等）
3. **调试时参考**: 查看"错误处理"和"组件层级"
4. **优化时参考**: 查看"性能优化"部分
5. **集成时参考**: 查看"API 集成架构"和"配置流向"

## 相关文档

- [API_HOOKS.md](./API_HOOKS.md) - 自定义 Hook API 详细文档
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - 环境变量配置指南
- [../BLUEPRINT.md](../BLUEPRINT.md) - 项目蓝图和技术栈

# PromptFill 贡献指南

感谢您对 PromptFill 的兴趣！本指南将帮助您了解如何为项目做出贡献。

---

## 目录

1. [行为准则](#行为准则)
2. [如何贡献](#如何贡献)
3. [开发环境设置](#开发环境设置)
4. [项目结构](#项目结构)
5. [编码规范](#编码规范)
6. [提交指南](#提交指南)
7. [拉取请求流程](#拉取请求流程)
8. [常见问题](#常见问题)

---

## 行为准则

### 我们的承诺

为了促进一个开放和欢迎的环境，作为贡献者和维护者，我们承诺参与项目和社区的每个人都能获得无骚扰的体验，无论其年龄、体型、残疾、种族、性别、性别认同和表现、经验水平、教育程度、社会经济地位、国籍、个人外表、种族、宗教或性身份和性取向如何。

### 我们的标准

有助于创造积极环境的行为包括：

- 使用欢迎和包容的语言
- 对不同的观点和经验保持尊重
- 接受建设性批评
- 关注对社区最有益的事情
- 对他人成员表现出同情

不可接受的行为包括：

- 使用性语言或意象以及不受欢迎的性关注或进展
- 挑衅、侮辱性/贬低性评论以及人身或政治攻击
- 公开或私下骚扰
- 发布他人的私人信息（例如物理或电子地址），未明确许可
- 在专业背景下可能合理地认为不适当的其他行为

### 执行

通过报告不可接受的行为至 [项目邮箱]，项目维护者负责澄清和执行我们的行为标准。

---

## 如何贡献

有很多方式可以为 PromptFill 做出贡献：

### 报告 Bug

在报告 bug 前，请检查 [问题列表](https://github.com/tanshilong/aipromptfill/issues) 以确保问题还未被报告。

当报告 bug 时，请包括：

- **清晰的描述** - 问题的简明摘要
- **重现步骤** - 具体的步骤来重现问题
- **实际行为** - 问题发生时的表现
- **期望行为** - 应该发生什么
- **环境信息** - 浏览器、操作系统等
- **截图或日志** - 如果适用

```markdown
**问题描述**
简要描述问题...

**重现步骤**
1. 执行...
2. 点击...
3. 看到...

**期望行为**
应该发生...

**实际行为**
实际发生...

**环境**
- 浏览器: Chrome 120
- 操作系统: Windows 11
- 应用版本: 1.0.0
```

### 提出功能建议

为新功能提出建议，请在 [问题列表](https://github.com/tanshilong/aipromptfill/issues) 中创建新问题并提供：

- **功能概述** - 简清地说明什么是新功能
- **使用案例** - 解释为什么需要此功能
- **预期行为** - 描述功能应该如何工作
- **可能的替代方案** - 列出是否有其他解决方案

### 改进文档

文档始终可以改进。您可以：

- 修复拼写和语法错误
- 澄清说明文本
- 添加缺失的文档
- 改进代码示例

### 提交代码

请按照"拉取请求流程"部分的步骤进行。

---

## 开发环境设置

### 前置要求

- Node.js 16+ 和 npm / pnpm
- Git
- 文本编辑器（推荐 VS Code）

### 本地设置

1. **Fork 仓库**

   访问 [PromptFill GitHub](https://github.com/tanshilong/aipromptfill) 并点击 "Fork"

2. **克隆您的 Fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/aipromptfill.git
   cd aipromptfill
   ```

3. **添加上游仓库**

   ```bash
   git remote add upstream https://github.com/tanshilong/aipromptfill.git
   ```

4. **安装依赖**

   ```bash
   npm install
   # 或
   pnpm install
   ```

5. **复制环境变量文件**

   ```bash
   cp .env.example .env.local
   ```

   然后在 `.env.local` 中配置您的环境变量（可选）。

6. **启动开发服务器**

   ```bash
   npm run dev
   # 或
   pnpm dev
   ```

   应用将在 `http://localhost:5173` 上运行。

### 构建和测试

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 执行数据同步（生成 JSON）
npm run sync-data
```

---

## 项目结构

```
aipromptfill/
├── src/
│   ├── App.jsx                    # 主应用组件
│   ├── main.jsx                   # 入口点
│   ├── components/                # 组件库 (55+ 组件)
│   │   ├── modals/               # 模态框组件
│   │   ├── icons/                # 图标组件
│   │   ├── LazyImage.jsx          # 懒加载组件
│   │   └── ...
│   ├── hooks/                     # 自定义 Hooks (9)
│   │   ├── useShareFunctions.js
│   │   ├── useImageExport.js
│   │   ├── useDataSync.js
│   │   └── ...
│   ├── utils/                     # 工具函数
│   │   ├── helpers.js
│   │   ├── cdnProxy.js            # CDN 代理工具
│   │   ├── platform.js
│   │   └── ...
│   ├── constants/                 # 配置常量
│   │   ├── config.js              # 集中配置管理
│   │   ├── templates.js           # 模板数据
│   │   ├── banks.js               # 词库数据
│   │   └── ...
│   ├── data/                      # 静态数据
│   │   └── ...
│   ├── styles/                    # 样式文件
│   └── App.css
├── public/                        # 静态资源
│   ├── data/                      # 生成的 JSON 数据
│   └── ...
├── docs/                          # 文档
│   ├── API_HOOKS.md              # Hook API 文档
│   ├── DATA_FLOW.md              # 数据流文档
│   └── ENVIRONMENT_SETUP.md      # 环境配置文档
├── scripts/                       # 构建脚本
│   └── sync-data.js
├── .env.example                   # 环境变量模板
├── vite.config.js                # Vite 配置
├── tailwind.config.js            # Tailwind 配置
├── package.json
├── BLUEPRINT.md                   # 项目蓝图
├── CHANGELOG.md                   # 更新日志
└── README.md
```

---

## 编码规范

### JavaScript/React 风格

- 使用 **ES6+ 语法**，包括箭头函数、解构、模板字符串
- 使用 **Functional Components** 和 Hooks
- **命名约定**：
  - 常量：`UPPER_SNAKE_CASE`
  - 函数/变量：`camelCase`
  - 组件：`PascalCase`
  - 文件名：`kebab-case.js` 或 `PascalCase.jsx`

### 示例

```javascript
// ✅ 好的
const MAX_RETRIES = 3;

function useCustomHook() {
  const [state, setState] = useState(null);
  return { state, setState };
}

const MyComponent = ({ title, onAction }) => {
  const handleClick = () => onAction?.();
  return <button onClick={handleClick}>{title}</button>;
};

// ❌ 避免
const maxRetries = 3; // 常量应该大写
function UseCustomHook() { } // Hook 不是组件
const my_component = () => {}; // 组件应该用 PascalCase
```

### 注释规范

```javascript
/**
 * 简要说明函数的作用
 * 
 * @param {Type} paramName - 参数说明
 * @returns {Type} 返回值说明
 */
export const myFunction = (paramName) => {
  // 解释复杂逻辑
  if (condition) {
    // 做某事
  }
};
```

### CSS/Tailwind 规范

- 优先使用 **Tailwind CSS** 类名
- 避免硬编码的颜色值
- 使用 CSS 变量和 Tailwind 自定义配置
- 保持响应式设计（mobile-first）

```jsx
// ✅ 好的
<div className="flex items-center justify-between gap-4 p-4 dark:bg-gray-900">
  <span className="text-sm text-gray-600">{title}</span>
</div>

// ❌ 避免
<div style={{ display: 'flex', color: '#333', padding: '16px' }}>
```

### 性能考虑

- 使用 `useMemo` 和 `useCallback` 优化重复计算
- 使用 `LazyImage` 组件处理图片懒加载
- 避免在渲染循环中创建新对象或函数
- 使用虚拟列表处理大数据集

---

## 提交指南

### 提交消息格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[scope]: <subject>

<body>

<footer>
```

### 类型

- **feat**: 新功能
- **fix**: bug 修复
- **docs**: 文档更新
- **style**: 代码风格（无功能变化）
- **refactor**: 代码重构
- **perf**: 性能优化
- **test**: 添加测试
- **chore**: 依赖更新、配置修改等

### 例子

```
feat(share): 添加短链接生成功能

实现了通过后端 API 生成短链的功能，支持
自动降级到长链接方案。

- 添加 API 调用逻辑
- 实现重试机制
- 添加单元测试

Closes #123
```

### 提交前检查

提交前，请确保：

1. 代码遵循项目的编码规范
2. 没有 console.log 或调试代码（除必要的日志）
3. 更新相关文档（如有）
4. 代码可以正常构建和运行

```bash
# 检查代码
npm run lint

# 构建项目
npm run build

# 本地测试
npm run dev
```

---

## 拉取请求流程

### 步骤

1. **创建分支**

   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/issue-number
   ```

2. **进行更改**

   在分支中进行您的更改，遵循编码规范。

3. **定期提交**

   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

4. **保持最新**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **推送到您的 Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建拉取请求**

   - 访问您的 Fork 仓库
   - 点击 "Pull Request" 按钮
   - 选择 `main` 分支作为基础分支
   - 填写 PR 模板

### 拉取请求模板

```markdown
## 描述

简要说明此 PR 的目的...

## 相关问题

关闭 #123

## 更改类型

- [ ] Bug 修复（非破坏性更改）
- [ ] 新功能（非破坏性更改）
- [ ] Breaking change
- [ ] 文档更新

## 测试

说明如何测试这些更改...

## 检查清单

- [ ] 我的代码遵循项目的风格指南
- [ ] 我已进行自我审查
- [ ] 我已更新相关文档
- [ ] 我的更改不会生成新的警告
- [ ] 我已添加必要的测试
```

### 代码审查

维护者将审查您的 PR。他们可能会：

- 要求更改
- 提供反馈和改进建议
- 在批准前测试您的代码

请及时回应评论并做出必要的更改。

---

## 常见问题

### Q: 我应该在哪里报告 bug？

A: 在 [GitHub Issues](https://github.com/tanshilong/aipromptfill/issues) 中创建新问题。

### Q: 如何与其他贡献者讨论想法？

A: 在相关的 Issue 中进行讨论，或在 [Discussions](https://github.com/tanshilong/aipromptfill/discussions) 中提出想法。

### Q: 我需要什么权限来合并 PR？

A: 只有项目维护者可以合并 PR。但任何人都可以创建 PR 进行审查。

### Q: 如何运行测试？

A: 目前项目没有自动化测试。我们欢迎帮助建立测试框架！

### Q: 我可以在生产环境中使用开发分支吗？

A: 不建议。请始终使用发布的版本（有 git tag）。

### Q: 如何更新依赖？

A: 运行 `npm update` 或 `pnpm update`，然后测试所有功能。更新应该在单独的 PR 中进行。

---

## 额外资源

- [项目 GitHub](https://github.com/tanshilong/aipromptfill)
- [问题列表](https://github.com/tanshilong/aipromptfill/issues)
- [讨论区](https://github.com/tanshilong/aipromptfill/discussions)
- [API 文档](./docs/API_HOOKS.md)
- [数据流文档](./docs/DATA_FLOW.md)

---

## 感谢

感谢所有为 PromptFill 做出贡献的人！您的工作帮助使这个项目变得更好。

---

**最后更新**: 2024-03-xx
**维护者**: PromptFill Team

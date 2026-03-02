import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 防止 Vite 默认清除控制台，方便调试
  clearScreen: false,
  // 让 Tauri 能够监听特定的端口
  server: {
    port: 1420,
    strictPort: true,
    host: true, // 保持原本的 --host 功能
    allowedHosts: ['tanshilongdeimac.local'],
  },
  // 设置环境变量的前缀，这样在 Tauri 中可以访问它们
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // 只有在 Tauri 构建时才应用特殊的 target
    target: process.env.TAURI_PLATFORM 
      ? (process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13')
      : 'modules', // 网页版使用标准的现代化模块 target
    // 在非调试构建中不缩小代码，方便报错定位（可选）
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 为调试构建生成源代码映射
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        // 手动分块：将大型第三方库单独打包，利用浏览器缓存
        manualChunks: {
          // React 核心（最稳定，缓存命中率最高）
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 动画库
          'vendor-motion': ['framer-motion'],
          // 图标库
          'vendor-icons': ['lucide-react'],
          // 数据存储（Dexie.js + pako 压缩）
          'vendor-storage': ['dexie', 'pako'],
          // 分享/二维码相关
          'vendor-share': ['qrcode.react'],
          // 样式工具
          'vendor-styles': ['clsx', 'tailwind-merge'],
        },
      },
    },
  },
})


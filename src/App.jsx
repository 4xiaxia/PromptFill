import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// ====== 导入数据配置 ======
import { INITIAL_TEMPLATES_CONFIG, TEMPLATE_TAGS, SYSTEM_DATA_VERSION } from './data/templates';
import { INITIAL_BANKS, INITIAL_DEFAULTS, INITIAL_CATEGORIES } from './data/banks';

// ====== 导入常量配置 ======
import { TRANSLATIONS } from './constants/translations';
import { TAG_STYLES, TAG_LABELS } from './constants/styles';
import { MASONRY_STYLES } from './constants/masonryStyles';
import { SMART_SPLIT_CONFIRM_MESSAGE, SMART_SPLIT_CONFIRM_TITLE, SMART_SPLIT_BUTTON_TEXT } from './constants/modalMessages';

// ====== 导入工具函数 ======
import { getLocalized, getSystemLanguage, copyToClipboard, saveDirectoryHandle } from './utils';
import { mergeTemplatesWithSystem, mergeBanksWithSystem } from './utils/merge';
import { generateAITerms, polishAndSplitPrompt } from './utils/aiService';  // AI 服务
import { uploadToICloud, downloadFromICloud } from './utils/icloud'; // iCloud 服务
import { getDirectoryHandle } from './utils/db'; // IndexedDB 工具

// ====== 导入自定义 Hooks ======
import { useStickyState, useAsyncStickyState, useEditorHistory, useLinkageGroups, useShareFunctions, useTemplateManagement, useServiceWorker, useDataSync, useImageExport } from './hooks';

// ====== 导入 UI 组件 ======
import { TemplateEditor, TemplatesSidebar, BanksSidebar, InsertVariableModal, AddBankModal, DiscoveryView, MobileSettingsView, SettingsView, Sidebar, TagSidebar } from './components';
import { ImagePreviewModal, SourceAssetModal, AnimatedSlogan, MobileAnimatedSlogan } from './components/preview';
import { MobileBottomNav } from './components/mobile';
import { ShareOptionsModal, CopySuccessModal, ImportTokenModal, ShareImportModal, CategoryManagerModal, ConfirmModal, AddTemplateTypeModal, VideoSubTypeModal, NoticeModal, ExportTemplatesModal, ImageUrlModal } from './components/modals';
import { DataUpdateNotice, AppUpdateNotice } from './components/notifications';


// ====== 以下组件保留在此文件中 ======
// CategorySection, BankGroup, CategoryManager, InsertVariableModal, App

// --- 组件：可折叠的分类区块 (New Component) ---
// ====== 核心组件区 (已提取至独立文件) ======

// Poster View Animated Slogan Constants - 已移至 constants/slogan.js

const App = () => {
  // 获取当前路由
  const location = useLocation();
  const isSettingPage = location.pathname === '/setting';

  // 当前应用代码版本 (必须与 package.json 和 version.json 一致)
  const APP_VERSION = "0.9.2";

  // 临时功能：瀑布流样式管理
  const [masonryStyleKey, setMasonryStyleKey] = useState('poster');

  // Global State with Persistence
  // 使用异步 IndexedDB 存储核心大数据
  const [banks, setBanks, isBanksLoaded] = useAsyncStickyState(INITIAL_BANKS, "app_banks_v9");
  const [defaults, setDefaults, isDefaultsLoaded] = useAsyncStickyState(INITIAL_DEFAULTS, "app_defaults_v9");
  const [categories, setCategories, isCategoriesLoaded] = useAsyncStickyState(INITIAL_CATEGORIES, "app_categories_v1");
  const [templates, setTemplates, isTemplatesLoaded] = useAsyncStickyState(INITIAL_TEMPLATES_CONFIG, "app_templates_v10");
  
  // 基础配置保持使用 LocalStorage (同步读取)
  const [language, setLanguage] = useStickyState(getSystemLanguage(), "app_language_v1"); // 全局UI语言
  const [templateLanguage, setTemplateLanguage] = useStickyState(getSystemLanguage(), "app_template_language_v1"); // 模板内容语言
  const [activeTemplateId, setActiveTemplateId] = useStickyState("tpl_photo_grid", "app_active_template_id_v4");

  const [isSmartSplitLoading, setIsSmartSplitLoading] = useState(false);
  const [isSmartSplitConfirmOpen, setIsSmartSplitConfirmOpen] = useState(false);
  const [isAddTemplateTypeModalOpen, setIsAddTemplateTypeModalOpen] = useState(false);
  const [isVideoSubTypeModalOpen, setIsVideoSubTypeModalOpen] = useState(false);

  // 包装 setActiveTemplateId，在智能拆分期间防止切换
  const handleSetActiveTemplateId = React.useCallback((id) => {
    if (isSmartSplitLoading) {
      return; // 正在拆分时，静默忽略切换请求，或者可以添加提示
    }
    setActiveTemplateId(id);
  }, [isSmartSplitLoading, setActiveTemplateId]);
  
  // Derived State: Current Active Template
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === activeTemplateId) || templates[0];
  }, [templates, activeTemplateId]);

  const userTemplates = useMemo(() => {
    const systemTemplateIds = new Set(INITIAL_TEMPLATES_CONFIG.map(t => t.id));
    return templates.filter(t => !systemTemplateIds.has(t.id));
  }, [templates]);
  
  const [lastAppliedDataVersion, setLastAppliedDataVersion] = useStickyState("", "app_data_version_v1");
  const [themeMode, setThemeMode] = useStickyState("system", "app_theme_mode_v1");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => setIsDarkMode(e.matches);
      setIsDarkMode(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(themeMode === 'dark');
    }
  }, [themeMode]);

  // 同步移动端浏览器状态栏颜色
  useEffect(() => {
    const themeColor = isDarkMode ? '#181716' : '#D6D6D6';
    
    // 1. 更新通用 theme-color
    let meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    
    // 2. 更新带 media 的 theme-color (保证系统级别平滑过渡)
    const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
    const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
    if (lightMeta) lightMeta.setAttribute('content', '#D6D6D6');
    if (darkMeta) darkMeta.setAttribute('content', '#181716');
    
    // 3. 始终保持 black-translucent 以实现真正的全屏沉浸体验
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      appleMeta.setAttribute('content', 'black-translucent');
    }
  }, [isDarkMode]);

  const [showDataUpdateNotice, setShowDataUpdateNotice] = useState(false);
  const [showAppUpdateNotice, setShowAppUpdateNotice] = useState(false);
  
  // UI State
  const [bankSidebarWidth, setBankSidebarWidth] = useStickyState(300, "app_bank_sidebar_width_v1"); // Default width reduced to 300px for more editor space
  const [isResizing, setIsResizing] = useState(false);
  const [iCloudEnabled, setICloudEnabled] = useStickyState(false, "app_icloud_sync_v1");
  // eslint-disable-next-line no-unused-vars
  const [isICloudSyncing, setIsICloudSyncing] = useState(false);
  const [lastICloudSyncAt, setLastICloudSyncAt] = useStickyState(0, "app_last_icloud_sync");
  const [lastICloudSyncError, setLastICloudSyncError] = useState("");
  
  // ====== iCloud 自动同步逻辑 ======
  // 1. 数据变更自动上传
  useEffect(() => {
    if (iCloudEnabled && isTemplatesLoaded && isBanksLoaded && isCategoriesLoaded && isDefaultsLoaded) {
      const syncTimer = setTimeout(async () => {
        const result = await uploadToICloud({
          templates,
          banks,
          categories,
          defaults,
          lastAppliedDataVersion
        });
        if (result?.ok) {
          setLastICloudSyncAt(result.timestamp);
          setLastICloudSyncError("");
        } else if (result?.error) {
          setLastICloudSyncError(result.error);
        }
      }, 2000); // 延迟2秒同步，避免频繁操作导致压力
      return () => clearTimeout(syncTimer);
    }
  }, [iCloudEnabled, templates, banks, categories, defaults, lastAppliedDataVersion, isTemplatesLoaded, isBanksLoaded, isCategoriesLoaded, isDefaultsLoaded]);

  // 2. 启动时检查云端数据
  useEffect(() => {
    const checkICloudUpdate = async () => {
      if (iCloudEnabled && isTemplatesLoaded && isBanksLoaded && isCategoriesLoaded && isDefaultsLoaded) {
        setIsICloudSyncing(true);
        const cloudData = await downloadFromICloud();
        setIsICloudSyncing(false);
        
        if (cloudData && cloudData.payload) {
          const { timestamp, payload } = cloudData;
          // 这里的逻辑可以根据你的需求调整：是直接覆盖，还是弹出提示？
          // 为了安全起见，我们暂且只在控制台输出，或者你可以添加一个“发现云端数据”的提示
          console.log('[iCloud] 发现云端数据，时间戳:', new Date(timestamp).toLocaleString());
          
          // 如果云端数据比本地新（这里需要更复杂的逻辑，比如存一个本地时间戳）
          // 或者如果本地是空的（刚安装 App），则直接加载
          const lastLocalSync = lastICloudSyncAt || 0;
          if (timestamp > lastLocalSync || templates.length <= INITIAL_TEMPLATES_CONFIG.length) {
            if (window.confirm(language === 'cn' ? '发现更新的 iCloud 云端备份，是否恢复数据？' : 'Found newer iCloud backup, restore data?')) {
              if (payload.templates) setTemplates(payload.templates);
              if (payload.banks) setBanks(payload.banks);
              if (payload.categories) setCategories(payload.categories);
              if (payload.defaults) setDefaults(payload.defaults);
              setLastICloudSyncAt(timestamp);
            }
          }
        }
      }
    };
    checkICloudUpdate();
  }, [iCloudEnabled, isTemplatesLoaded, isBanksLoaded, isCategoriesLoaded, isDefaultsLoaded, lastICloudSyncAt]);

  // 检测是否为移动设备
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
  const [mobileTab, setMobileTab] = useState(isMobileDevice ? "home" : "editor"); // 'home', 'editor', 'settings'

  // 路由同步 mobileTab
  useEffect(() => {
    if (isSettingPage && isMobileDevice) {
      setMobileTab('settings');
    }
  }, [isSettingPage, isMobileDevice]);
  const [isTemplatesDrawerOpen, setIsTemplatesDrawerOpen] = useState(false);
  const [isBanksDrawerOpen, setIsBanksDrawerOpen] = useState(false);
  const [touchDraggingVar, setTouchDraggingVar] = useState(null); // { key, x, y } 用于移动端模拟拖拽

  const [isEditing, setIsEditing] = useState(false);
  const [activePopover, setActivePopover] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false); // New UI state
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false); // New UI state for Insert Picker
  const [isCopySuccessModalOpen, setIsCopySuccessModalOpen] = useState(false); // New UI state for Copy Success
  const [deleteTemplateTargetId, setDeleteTemplateTargetId] = useState(null);
  const [isDeleteTemplateConfirmOpen, setIsDeleteTemplateConfirmOpen] = useState(false);
  const [actionConfirm, setActionConfirm] = useState(null);
  const [noticeMessage, setNoticeMessage] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportTemplateIds, setSelectedExportTemplateIds] = useState([]);

  // Add Bank State
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankLabel, setNewBankLabel] = useState("");
  const [newBankKey, setNewBankKey] = useState("");
  const [newBankCategory, setNewBankCategory] = useState("other");

  // Template Management UI State
  const [editingTemplateNameId, setEditingTemplateNameId] = useState(null);
  const [tempTemplateName, setTempTemplateName] = useState("");
  const [tempTemplateAuthor, setTempTemplateAuthor] = useState("");
  const [tempTemplateBestModel, setTempTemplateBestModel] = useState("");
  const [tempTemplateBaseImage, setTempTemplateBaseImage] = useState("");
  const [tempVideoUrl, setTempVideoUrl] = useState("");

  // 监听 activeTemplate 变化，同步更新模板基础信息（用于已有模板的兼容性初始化）
  React.useEffect(() => {
    if (activeTemplate) {
      // 如果模板缺少这些属性，我们在这里做一次静默初始化（仅针对内存中的状态）
      // 实际保存会在用户操作或切换时发生
      if (!activeTemplate.bestModel) {
        setTempTemplateBestModel("Nano Banana Pro");
      } else {
        setTempTemplateBestModel(activeTemplate.bestModel);
      }
      
      if (!activeTemplate.baseImage) {
        setTempTemplateBaseImage("optional_base_image");
      } else {
        setTempTemplateBaseImage(activeTemplate.baseImage);
      }

      // 同步视频URL
      setTempVideoUrl(activeTemplate.videoUrl || "");
    }
  }, [activeTemplate?.id]);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [sourceZoomedItem, setSourceZoomedItem] = useState(null);
  // 移除这一行，将状态移入独立的 Modal 组件
  // const [modalMousePos, setModalMousePos] = useState({ x: 0, y: 0 });
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageUpdateMode, setImageUpdateMode] = useState('replace'); // 'replace' or 'add'
  const [currentImageEditIndex, setCurrentImageEditIndex] = useState(0);
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  
  // File System Access API State
  const [storageMode, setStorageMode] = useState(() => {
    return localStorage.getItem('app_storage_mode') || 'browser';
  });
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [isFileSystemSupported, setIsFileSystemSupported] = useState(false);
  
  // Template Tag Management State
  const [selectedTags, setSelectedTags] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState("all"); // all, official, personal
  const [selectedType, setSelectedType] = useState("all"); // all, image, video
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplateTags, setEditingTemplateTags] = useState(null); // {id, tags}
  const [isDiscoveryView, setDiscoveryView] = useState(true); // 首次加载默认显示发现（海报）视图
  
  // 统一的发现页切换处理器
  const handleSetDiscoveryView = React.useCallback((val, options = {}) => {
    const { skipMobileTabSync = false } = options;
    setDiscoveryView(val);
    // 移动端：侧边栏里的“回到发现页”按钮需要同步切回 mobileTab
    if (!skipMobileTabSync && isMobileDevice && val) {
      setMobileTab('home');
    } else if (!skipMobileTabSync && isMobileDevice && !val && mobileTab === 'home') {
      setMobileTab('editor');
    }
  }, [isMobileDevice, mobileTab]);

  const [isPosterAutoScrollPaused, setIsPosterAutoScrollPaused] = useState(false);
  const posterScrollRef = useRef(null);
  const popoverRef = useRef(null);
  const textareaRef = useRef(null);
  const sidebarRef = useRef(null);
  
  // 移动端：首页是否展示完全由 mobileTab 控制，避免 isDiscoveryView 残留导致其它 Tab 白屏
  // 桌面端：保持现有 isDiscoveryView 行为（不影响已正常的桌面端）
  const showDiscoveryOverlay = isMobileDevice ? mobileTab === "home" : isDiscoveryView;
  
  // Template Sort State
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest, a-z, z-a, random
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [randomSeed, setRandomSeed] = useState(Date.now()); // 用于随机排序的种子
  
  // 趣味设计：灯具摆动状态
  const [lampRotation, setLampRotation] = useState(0);
  const [isLampHovered, setIsLampHovered] = useState(false);
  const [isLampOn, setIsLampOn] = useState(true); // 暗色模式下灯是否开启 (强度控制)
  
  // 当暗夜模式关闭时，重置灯的状态为开启
  useEffect(() => {
    if (!isDarkMode) {
      setIsLampOn(true);
    }
  }, [isDarkMode]);

  const handleLampMouseMove = (e) => {
    if (!isDarkMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const mouseX = e.clientX;
    const diffX = mouseX - centerX;
    // 灵敏度提升：由于感应区缩小到 32px，调整系数以保持摆动幅度
    const rotation = Math.max(-12, Math.min(12, -diffX / 1.5));
    setLampRotation(rotation);
    setIsLampHovered(true);
  };

  const [updateNoticeType, setUpdateNoticeType] = useState(null); // 'app' | 'data' | null

  // Service Worker - 图片缓存
  useServiceWorker();

  // ====== 智能多源数据同步逻辑 ======
  useDataSync({
    lastAppliedDataVersion,
    SYSTEM_DATA_VERSION,
    setTemplates,
    setBanks,
    setDefaults,
    setCategories,
    setLastAppliedDataVersion,
  });
  // ================================

  // 检查系统模版更新
  // 检测数据版本更新 (模板与词库)
  useEffect(() => {
    if (SYSTEM_DATA_VERSION && lastAppliedDataVersion !== SYSTEM_DATA_VERSION) {
      // 检查是否有存储的数据。如果是第一次使用（无数据），直接静默更新版本号
      const hasTemplates = localStorage.getItem("app_templates_v10");
      const hasBanks = localStorage.getItem("app_banks_v9");
      
      if (hasTemplates || hasBanks) {
        setShowDataUpdateNotice(true);
      } else {
        setLastAppliedDataVersion(SYSTEM_DATA_VERSION);
      }
    }
  }, [lastAppliedDataVersion]);

  // 检查应用代码版本更新与数据版本更新
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const response = await fetch('/version.json?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          
          // 检查应用版本更新
          if (data.appVersion && data.appVersion !== APP_VERSION) {
            setUpdateNoticeType('app');
            setShowAppUpdateNotice(true);
            return; // 优先提示程序更新
          }
          
          // 检查数据定义更新 (存在于代码中，但服务器上更新了)
          if (data.dataVersion && data.dataVersion !== SYSTEM_DATA_VERSION) {
            setUpdateNoticeType('data');
            setShowAppUpdateNotice(true);
          }
        }
      } catch (e) {
        // 静默失败
      }
    };
    
    checkUpdates();
    const timer = setInterval(checkUpdates, 5 * 60 * 1000); // 5分钟检查一次
    
    return () => clearInterval(timer);
  }, [lastAppliedDataVersion]); // 移除 lastAppliedAppVersion 依赖

  // 当在编辑模式下切换模板或语言时，同步更新标题和作者的临时状态
  useEffect(() => {
    if (isEditing && activeTemplate) {
      setTempTemplateName(getLocalized(activeTemplate.name, language));
      setTempTemplateAuthor(activeTemplate.author || "");
      setEditingTemplateNameId(activeTemplate.id);
    }
  }, [activeTemplateId, isEditing, language]);

  // Helper: Translate
  const t = (key, params = {}) => {
    let str = TRANSLATIONS[language][key] || key;
    Object.keys(params).forEach(k => {
        str = str.replace(`{{${k}}}`, params[k]);
    });
    return str;
  };

  const displayTag = React.useCallback((tag) => {
    return TAG_LABELS[language]?.[tag] || tag;
  }, [language]);

  // 确保有一个有效的 activeTemplateId - 自动选择第一个模板
  useEffect(() => {
      if (templates.length > 0) {
          // 检查当前 activeTemplateId 是否有效
          const currentTemplateExists = templates.some(t => t.id === activeTemplateId);
          if (!currentTemplateExists || !activeTemplateId) {
              // 如果当前选中的模板不存在或为空，选择第一个模板
              console.log('[自动选择] 选择第一个模板:', templates[0].id);
              setActiveTemplateId(templates[0].id);
          }
      }
  }, [templates, activeTemplateId]);  // 依赖 templates 和 activeTemplateId

  // 移动端：切换 Tab 时的状态保障
  useEffect(() => {
      // 模版 Tab：强制收起模式 + 列表视图
      if (mobileTab === 'templates') {
          setMasonryStyleKey('list');
      }

      // 编辑 / 词库 Tab：确保有选中的模板
      if ((mobileTab === 'editor' || mobileTab === 'banks') && templates.length > 0 && !activeTemplateId) {
          console.log('[tab切换] 自动选择第一个模板:', templates[0].id);
          setActiveTemplateId(templates[0].id);
      }
  }, [mobileTab, templates, activeTemplateId]);

  // Check File System Access API support and restore directory handle
  useEffect(() => {
      const checkSupport = async () => {
          const supported = 'showDirectoryPicker' in window;
          setIsFileSystemSupported(supported);
          
          // Try to restore directory handle from IndexedDB
          if (supported && storageMode === 'folder') {
              try {
                  const handle = await getDirectoryHandle();
                  if (handle) {
                      // Verify permission
                      const permission = await handle.queryPermission({ mode: 'readwrite' });
                      if (permission === 'granted') {
                          setDirectoryHandle(handle);
                          // Load data from file system
                          await loadFromFileSystem(handle);
                      } else {
                          // Permission not granted, switch back to browser storage
                          setStorageMode('browser');
                          localStorage.setItem('app_storage_mode', 'browser');
                      }
                  }
              } catch (error) {
                  console.error('恢复文件夹句柄失败:', error);
              }
          }
      };
      
      checkSupport();
  }, []);

  // ====== 数据迁移与初始化 ======
  useEffect(() => {
    async function migrateAndInit() {
      const { isMigrated, markMigrated, dbSet, getDirectoryHandle: getHandle } = await import('./utils/db');
      
      if (!isMigrated()) {
        console.log('检测到旧版 LocalStorage 数据，开始执行 IndexedDB 迁移...');
        try {
          // 迁移模板
          const oldTemplates = localStorage.getItem("app_templates_v10");
          if (oldTemplates) await dbSet("app_templates_v10", JSON.parse(oldTemplates));
          
          // 迁移词库
          const oldBanks = localStorage.getItem("app_banks_v9");
          if (oldBanks) await dbSet("app_banks_v9", JSON.parse(oldBanks));
          
          // 迁移分类
          const oldCategories = localStorage.getItem("app_categories_v1");
          if (oldCategories) await dbSet("app_categories_v1", JSON.parse(oldCategories));
          
          // 迁移默认值
          const oldDefaults = localStorage.getItem("app_defaults_v9");
          if (oldDefaults) await dbSet("app_defaults_v9", JSON.parse(oldDefaults));

          markMigrated();
          console.log('数据迁移完成！');
          
          // 迁移完成后刷新页面以应用新数据
          window.location.reload();
        } catch (error) {
          console.error('数据迁移失败:', error);
        }
      }

      // 重新恢复文件夹句柄
      const handle = await getHandle();
      if (handle) {
        setDirectoryHandle(handle);
        // 验证权限
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          console.log('文件夹访问权限已过期，需重新授权');
        }
      }
    }
    migrateAndInit();
  }, []);

  // Fix initial categories if empty (migration safety)
  useEffect(() => {
      if (isCategoriesLoaded && (!categories || Object.keys(categories).length === 0)) {
          setCategories(INITIAL_CATEGORIES);
      }
  }, [isCategoriesLoaded]);

  // Ensure all templates have tags field and sync default templates' tags (migration safety)
  useEffect(() => {
    if (!isTemplatesLoaded) return;
    
    let needsUpdate = false;
    const updatedTemplates = templates.map(t => {
      // Find if this is a default template
      const defaultTemplate = INITIAL_TEMPLATES_CONFIG.find(dt => dt.id === t.id);
      
      if (defaultTemplate) {
        // Sync tags from default template if it's a built-in one
        if (JSON.stringify(t.tags) !== JSON.stringify(defaultTemplate.tags)) {
          needsUpdate = true;
          return { ...t, tags: defaultTemplate.tags || [] };
        }
      } else if (!t.tags) {
        // User-created template without tags
        needsUpdate = true;
        return { ...t, tags: [] };
      }
      
      return t;
    });
    
    if (needsUpdate) {
      setTemplates(updatedTemplates);
    }
  }, [isTemplatesLoaded]);


  // ====== Bank 相关函数（需要在 Hook 之前定义）======
  const handleAddOption = React.useCallback((key, newOption) => {
    // 兼容对象格式和字符串格式
    const isValid = typeof newOption === 'string' ? newOption.trim() : (newOption && (newOption.cn || newOption.en));
    if (!isValid) return;

    setBanks(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: [...prev[key].options, newOption]
      }
    }));
  }, [setBanks]);

  const handleUpdateOption = React.useCallback((key, oldOption, newOption) => {
    const isValid = typeof newOption === 'string' ? newOption.trim() : (newOption && (newOption.cn || newOption.en));
    if (!isValid) return;

    setBanks(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: prev[key].options.map(opt => opt === oldOption ? newOption : opt)
      }
    }));
  }, [setBanks]);

  // 动态更新 SEO 标题和描述
  useEffect(() => {
    if (activeTemplate && typeof window !== 'undefined') {
      try {
        const templateName = getLocalized(activeTemplate.name, language);
        if (templateName) {
          const siteTitle = "Prompt Fill | 提示词填空器";
          document.title = `${templateName} - ${siteTitle}`;
          
          // 动态更新 meta description
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            const content = typeof activeTemplate.content === 'object' 
              ? (activeTemplate.content[language] || activeTemplate.content.cn || activeTemplate.content.en || "")
              : (activeTemplate.content || "");
            
            if (content) {
              const descriptionText = content.slice(0, 150).replace(/[#*`]/g, '').replace(/\s+/g, ' ');
              metaDescription.setAttribute("content", `${templateName}: ${descriptionText}...`);
            }
          }
        }
      } catch (e) {
        console.error("SEO update error:", e);
      }
    }
  }, [activeTemplate, language]);

  const handleDeleteOption = React.useCallback((key, optionToDelete) => {
    setBanks(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: prev[key].options.filter(opt => opt !== optionToDelete)
      }
    }));
  }, [setBanks]);

  // ====== 使用自定义 Hooks ======

  // 1. 编辑器历史记录 Hook
  const {
    historyPast,
    historyFuture,
    updateActiveTemplateContent,
    handleUndo,
    handleRedo,
    resetHistory,
    // eslint-disable-next-line no-unused-vars
    canUndo,
    // eslint-disable-next-line no-unused-vars
    canRedo,
  } = useEditorHistory(activeTemplateId, activeTemplate, setTemplates);

  // 2. 联动组管理 Hook
  const linkageGroups = useLinkageGroups(
    activeTemplateId,
    templates,
    setTemplates,
    banks,
    handleAddOption
  );

  const {
    parseVariableName,
    cursorInVariable,
    setCursorInVariable,
    currentVariableName,
    setCurrentVariableName,
    currentGroupId,
    setCurrentGroupId,
    // eslint-disable-next-line no-unused-vars
    findLinkedVariables,
    // eslint-disable-next-line no-unused-vars
    updateActiveTemplateSelection,
    handleSelect: handleSelectFromHook,
    handleAddCustomAndSelect: handleAddCustomAndSelectFromHook,
  } = linkageGroups;

  // 3. 分享功能 Hook
  const {
    sharedTemplateData,
    showShareImportModal,
    showShareOptionsModal,
    showImportTokenModal,
    importTokenValue,
    // eslint-disable-next-line no-unused-vars
    shareUrlMemo,
    currentShareUrl,
    isGenerating,
    isPrefetching,
    prefetchedShortCode,
    shareImportError,
    setShareImportError,
    isImportingShare,
    shortCodeError,
    // eslint-disable-next-line no-unused-vars
    setSharedTemplateData,
    setShowShareImportModal,
    setShowShareOptionsModal,
    setShowImportTokenModal,
    setImportTokenValue,
    handleManualTokenImport,
    handleImportSharedTemplate,
    handleShareLink,
    doCopyShareLink,
    handleShareToken,
    getShortCodeFromServer,
  } = useShareFunctions(
    activeTemplate,
    setTemplates,
    setActiveTemplateId,
    setDiscoveryView,
    isMobileDevice,
    setMobileTab,
    language,
    t,
    banks,
    setBanks,
    categories,
    setCategories,
    templates
  );

  useEffect(() => {
    if (!shareImportError) return;
    setNoticeMessage(shareImportError);
    setShareImportError(null);
  }, [shareImportError, setShareImportError]);

  // 4. 图片导出 Hook
  const {
    isExporting,
    preCacheImage,
    handleExportImage,
  } = useImageExport({
    activeTemplate,
    activeTemplateId,
    banks,
    categories,
    language,
    INITIAL_TEMPLATES_CONFIG,
    getShortCodeFromServer,
    setNoticeMessage,
  });

  // 静默预缓存当前模板图片（提升导出体验）
  useEffect(() => {
    if (activeTemplate?.imageUrl) {
      const timer = setTimeout(() => preCacheImage(activeTemplate.imageUrl), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTemplate?.imageUrl, preCacheImage]);

  // Template Management
  const templateManagement = useTemplateManagement(
    templates,
    setTemplates,
    activeTemplateId,
    activeTemplate,
    setActiveTemplateId,
    setIsEditing,
    setEditingTemplateNameId,
    setTempTemplateName,
    setTempTemplateAuthor,
    tempTemplateBestModel,
    setTempTemplateBestModel,
    tempTemplateBaseImage,
    setTempTemplateBaseImage,
    tempVideoUrl,
    setTempVideoUrl,
    language,
    isMobileDevice,
    setMobileTab,
    INITIAL_TEMPLATES_CONFIG,
    t
  );
  const {
    handleAddTemplate: performAddTemplate,
    handleDuplicateTemplate,
    handleDeleteTemplate,
    handleResetTemplate,
    startRenamingTemplate,
    handleStartEditing,
    handleStopEditing
  } = templateManagement;

  const handleAddTemplate = React.useCallback(() => {
    setIsAddTemplateTypeModalOpen(true);
  }, []);

  const onConfirmAddTemplate = React.useCallback((type) => {
    if (type === 'video') {
      // 视频模板：关闭类型弹窗，打开子类型弹窗
      setIsAddTemplateTypeModalOpen(false);
      setIsVideoSubTypeModalOpen(true);
    } else {
      // 图片模板：直接创建并跳转到编辑页
      performAddTemplate(type);
      setIsAddTemplateTypeModalOpen(false);
      setDiscoveryView(false);
    }
  }, [performAddTemplate]);

  const onConfirmVideoSubType = React.useCallback((subType) => {
    performAddTemplate('video', subType);
    setIsVideoSubTypeModalOpen(false);
    setDiscoveryView(false);
  }, [performAddTemplate]);

  const requestDeleteTemplate = React.useCallback((id, e) => {
    if (e) e.stopPropagation();
    setDeleteTemplateTargetId(id);
    setIsDeleteTemplateConfirmOpen(true);
  }, []);

  const confirmDeleteTemplate = React.useCallback(() => {
    if (!deleteTemplateTargetId) return;
    handleDeleteTemplate(deleteTemplateTargetId, undefined, { skipConfirm: true });
    setDeleteTemplateTargetId(null);
  }, [deleteTemplateTargetId, handleDeleteTemplate]);

  const openExportModal = React.useCallback(() => {
    if (userTemplates.length === 0) {
      setNoticeMessage(language === 'cn' ? '暂无可导出的个人模版' : 'No user templates to export');
      return;
    }
    setSelectedExportTemplateIds(userTemplates.map(t => t.id));
    setIsExportModalOpen(true);
  }, [userTemplates, language]);

  const toggleExportTemplateId = React.useCallback((id) => {
    setSelectedExportTemplateIds(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ));
  }, []);

  const toggleExportSelectAll = React.useCallback(() => {
    if (selectedExportTemplateIds.length === userTemplates.length) {
      setSelectedExportTemplateIds([]);
    } else {
      setSelectedExportTemplateIds(userTemplates.map(t => t.id));
    }
  }, [selectedExportTemplateIds, userTemplates]);

  const openActionConfirm = React.useCallback((config) => {
    setActionConfirm(config);
  }, []);

  const closeActionConfirm = React.useCallback(() => {
    setActionConfirm(null);
  }, []);

  const requestResetTemplate = React.useCallback((id, e) => {
    if (e) e.stopPropagation();
    openActionConfirm({
      title: language === 'cn' ? '恢复模板' : 'Reset Template',
      message: t('confirm_reset_template'),
      confirmText: language === 'cn' ? '恢复' : 'Reset',
      cancelText: language === 'cn' ? '取消' : 'Cancel',
      onConfirm: () => handleResetTemplate(id, undefined, { skipConfirm: true }),
    });
  }, [language, t, handleResetTemplate, openActionConfirm]);

  // 包装 saveTemplateName，传入状态值
  const saveTemplateName = () => {
    if (editingTemplateNameId && tempTemplateName && tempTemplateName.trim()) {
      templateManagement.saveTemplateName(
        editingTemplateNameId, 
        tempTemplateName, 
        tempTemplateAuthor,
        tempTemplateBestModel,
        tempTemplateBaseImage,
        tempVideoUrl
      );
    }
  };

  // 新增：专门用于更新模板属性的函数（选择后立即生效）
  const updateTemplateProperty = (property, value) => {
    if (!activeTemplateId) return;
    
    // 更新临时状态
    if (property === 'bestModel') setTempTemplateBestModel(value);
    if (property === 'baseImage') setTempTemplateBaseImage(value);

    // 立即保存到 templates 列表
    setTemplates(prev => prev.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, [property]: value };
      }
      return t;
    }));
  };

  // 包装 handleSelect，使其兼容原有调用方式
  const handleSelect = React.useCallback((key, index, value) => {
    handleSelectFromHook(key, index, value, setActivePopover);
  }, [handleSelectFromHook]);

  // 包装 handleAddCustomAndSelect，使其兼容原有调用方式
  const handleAddCustomAndSelect = React.useCallback((key, index, newValue) => {
    handleAddCustomAndSelectFromHook(key, index, newValue, setActivePopover);
  }, [handleAddCustomAndSelectFromHook]);

  // AI 生成词条处理函数（增强版：支持上下文感知 + 联动组清理）
  const performSmartSplit = React.useCallback(async () => {
    if (!activeTemplate) return;
    
    const rawPrompt = getLocalized(activeTemplate.content, templateLanguage);
    
    setIsSmartSplitLoading(true);
    try {
      // 提取现有词库的特征上下文（键名、中文名称、示例词组）
      // 我们只提取前 2 个选项作为示例，避免上下文过长
      const existingBankContext = Object.entries(banks).map(([key, bank]) => {
        const label = typeof bank.label === 'object' ? (bank.label.cn || bank.label.en) : bank.label;
        const samples = (bank.options || [])
          .slice(0, 2)
          .map(opt => typeof opt === 'object' ? (opt.cn || opt.en) : opt)
          .join(', ');
        return `- {{${key}}} (${label}) [示例: ${samples}]`;
      }).join('\n');

      const result = await polishAndSplitPrompt({
        rawPrompt,
        existingBankContext, // 发送详细上下文
        availableTags: TEMPLATE_TAGS,
        language: templateLanguage
      });

      console.log('[App] Smart Split Result:', result);

      if (result) {
        // 1. 更新模板内容
        const newContent = typeof activeTemplate.content === 'object'
          ? { ...activeTemplate.content, [templateLanguage]: result.content }
          : result.content;
        
        // 2. 批量处理变量和词库
        const newBanks = { ...banks };
        const newDefaults = { ...defaults };
        const newSelections = { ...activeTemplate.selections };

        if (result.variables && Array.isArray(result.variables)) {
          result.variables.forEach(v => {
            // 如果是新词库，添加到 banks
            if (!newBanks[v.key]) {
              newBanks[v.key] = {
                label: typeof v.label === 'string' ? { cn: v.label, en: v.label } : v.label,
                category: v.category || 'other',
                options: v.options.map(opt => (typeof opt === 'string' ? { cn: opt, en: opt } : opt))
              };
              // 添加到 defaults
              newDefaults[v.key] = typeof v.default === 'string' ? { cn: v.default, en: v.default } : v.default;
            }
            
            // 设置当前模板的选择值
            const defaultValue = v.default || (v.options && v.options[0]);
            newSelections[v.key] = typeof defaultValue === 'string' ? { cn: defaultValue, en: defaultValue } : defaultValue;
          });
        }

        // 3. 更新全局状态
        setBanks(newBanks);
        setDefaults(newDefaults);

        // 4. 更新当前模板
        setTemplates(prev => prev.map(t => {
          if (t.id === activeTemplateId) {
            // 过滤标签，确保只使用系统中存在的标签
            const filteredTags = result.tags 
              ? result.tags.filter(tag => TEMPLATE_TAGS.includes(tag))
              : t.tags;

            return {
              ...t,
              name: result.name || t.name,
              content: newContent,
              selections: newSelections,
              tags: filteredTags
            };
          }
          return t;
        }));

        // 5. 特殊处理：如果名称更新了，也同步到临时编辑状态
        if (result.name) {
          setTempTemplateName(typeof result.name === 'string' ? result.name : (result.name[language] || result.name.cn || result.name.en));
        }

        // 提示成功
        console.log('[App] Smart Split Success');
      }
    } catch (error) {
      console.error('[App] Smart Split Error:', error);
      alert(language === 'cn' ? `智能拆分失败: ${error.message}` : `Smart Split failed: ${error.message}`);
    } finally {
      setIsSmartSplitLoading(false);
    }
  }, [activeTemplate, templateLanguage, language, banks, defaults, setBanks, setDefaults, setTemplates, activeTemplateId, setTempTemplateName]);

  const handleSmartSplit = React.useCallback(async () => {
    if (!activeTemplate) return;
    
    const rawPrompt = getLocalized(activeTemplate.content, templateLanguage);
    if (!rawPrompt || rawPrompt.trim().length < 10) {
      alert(language === 'cn' ? '提示词太短了，请先输入一些内容再尝试智能拆分' : 'Prompt too short, please enter more text first.');
      return;
    }

    setIsSmartSplitConfirmOpen(true);
  }, [activeTemplate, templateLanguage, language]);

  const handleGenerateAITerms = React.useCallback(async (params) => {
    console.log('[App] AI Generation Request:', params);

    // 收集当前模板中已选择的所有变量值，用于 AI 上下文理解
    const selectedValues = {};
    if (activeTemplate?.selections) {
      // 第一步：解析 selections，按 baseKey 分组
      const selectionsByBaseKey = {};
      Object.entries(activeTemplate.selections).forEach(([key, value]) => {
        // key 格式可能是 "subject-0", "clothing_1-2" 等
        const parts = key.split('-');
        const varKey = parts[0]; // "subject" 或 "clothing_1"
        const index = parts[1]; // "0" 或 "2"

        // 提取 baseKey（去掉数字后缀）
        const baseKey = varKey.replace(/_\d+$/, '');

        if (!selectionsByBaseKey[baseKey]) {
          selectionsByBaseKey[baseKey] = [];
        }

        selectionsByBaseKey[baseKey].push({
          fullKey: key,
          index: index ? parseInt(index) : -1,  // 改为 -1，确保带 -N 的键优先
          value: value
        });
      });

      // 第二步：对于每个 baseKey，只保留索引最大的值（最新的选择）
      Object.entries(selectionsByBaseKey).forEach(([baseKey, items]) => {
        // 按索引降序排序，带 -N 的键会排在前面
        items.sort((a, b) => b.index - a.index);

        if (items.length > 1) {
          console.log(`[App] 检测到联动组变量 ${baseKey}，使用最新值:`, items[0].fullKey, '=', items[0].value, '，忽略旧值:', items.slice(1).map(i => i.fullKey));
        }

        const latest = items[0];

        // 过滤掉当前正在生成的变量
        const currentVarBaseKey = params.variableId.replace(/_\d+$/, '');
        if (baseKey !== currentVarBaseKey) {
          // 提取实际的显示值（支持双语对象）
          let displayValue = latest.value;
          if (typeof latest.value === 'object' && latest.value !== null) {
            displayValue = latest.value[language] || latest.value.cn || latest.value.en || JSON.stringify(latest.value);
          }
          selectedValues[latest.fullKey] = displayValue;
        }
      });
    }

    console.log('[App] Selected values for AI context:', selectedValues);

    // 调用 AI 服务生成词条，传递已选择的值
    try {
      const result = await generateAITerms({
        ...params,
        selectedValues  // 新增：传递用户已选择的变量值
      });
      console.log('[App] AI Generation Result:', result);
      return result;
    } catch (error) {
      console.error('[App] AI Generation Error:', error);
      throw error;
    }
  }, [activeTemplate, language]);

  // 分享相关函数已移至 useShareFunctions Hook

  // --- Effects ---

  // Reset history when template changes
  useEffect(() => {
    resetHistory();
  }, [activeTemplateId, resetHistory]);

  // 检测光标是否在变量内，并提取当前变量信息
  const detectCursorInVariable = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isEditing) {
      setCursorInVariable(false);
      setCurrentVariableName(null);
      setCurrentGroupId(null);
      return;
    }

    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // 向前查找最近的 {{
    let startPos = cursorPos;
    while (startPos > 0 && text.substring(startPos - 2, startPos) !== '{{') {
      startPos--;
    }

    // 向后查找最近的 }}
    let endPos = cursorPos;
    while (endPos < text.length && text.substring(endPos, endPos + 2) !== '}}') {
      endPos++;
    }

    // 检查光标是否在 {{...}} 之间
    if (startPos >= 0 && endPos < text.length &&
        text.substring(startPos - 2, startPos) === '{{' &&
        text.substring(endPos, endPos + 2) === '}}') {
      // 光标在变量内
      const variableName = text.substring(startPos, endPos).trim();
      const parsed = parseVariableName(variableName);

      setCursorInVariable(true);
      setCurrentVariableName(variableName);
      setCurrentGroupId(parsed.groupId);
    } else {
      setCursorInVariable(false);
      setCurrentVariableName(null);
      setCurrentGroupId(null);
    }
  }, [isEditing, parseVariableName, setCursorInVariable, setCurrentVariableName, setCurrentGroupId]);

  // 监听光标位置变化
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isEditing) return;

    const handleSelectionChange = () => {
      detectCursorInVariable();
    };

    textarea.addEventListener('keyup', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('select', handleSelectionChange);

    return () => {
      textarea.removeEventListener('keyup', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('select', handleSelectionChange);
    };
  }, [isEditing, detectCursorInVariable]);

  // 设置分组：为当前变量添加或修改分组后缀
  const handleSetGroup = React.useCallback((groupNum) => {
    if (!cursorInVariable || !currentVariableName) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // 向前查找最近的 {{
    let startPos = cursorPos;
    while (startPos > 0 && text.substring(startPos - 2, startPos) !== '{{') {
      startPos--;
    }

    // 向后查找最近的 }}
    let endPos = cursorPos;
    while (endPos < text.length && text.substring(endPos, endPos + 2) !== '}}') {
      endPos++;
    }

    if (startPos >= 0 && endPos < text.length) {
      const variableName = text.substring(startPos, endPos).trim();
      const parsed = parseVariableName(variableName);
      const baseKey = parsed.baseKey;

      // 构建新的变量名：baseKey_groupNum
      const newVariableName = `${baseKey}_${groupNum}`;

      // 替换文本：只替换 {{ 和 }} 之间的内容
      const before = text.substring(0, startPos);
      const after = text.substring(endPos);
      const newText = `${before}${newVariableName}${after}`;

      // 更新内容
      const currentContent = activeTemplate.content;
      const isMultilingual = typeof currentContent === 'object';
      if (isMultilingual) {
        updateActiveTemplateContent({
          ...currentContent,
          [templateLanguage]: newText
        }, true);
      } else {
        updateActiveTemplateContent(newText, true);
      }

      // 恢复光标位置（调整偏移）
      setTimeout(() => {
        const offset = newVariableName.length - variableName.length;
        const newCursorPos = cursorPos + offset;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
        detectCursorInVariable();
      }, 0);
    }
  }, [cursorInVariable, currentVariableName, parseVariableName, activeTemplate.content, templateLanguage, updateActiveTemplateContent, detectCursorInVariable]);

  // 移除分组：移除当前变量的分组后缀
  const handleRemoveGroup = React.useCallback(() => {
    if (!cursorInVariable || !currentVariableName || !currentGroupId) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    // 向前查找最近的 {{
    let startPos = cursorPos;
    while (startPos > 0 && text.substring(startPos - 2, startPos) !== '{{') {
      startPos--;
    }

    // 向后查找最近的 }}
    let endPos = cursorPos;
    while (endPos < text.length && text.substring(endPos, endPos + 2) !== '}}') {
      endPos++;
    }

    if (startPos >= 0 && endPos < text.length) {
      const variableName = text.substring(startPos, endPos).trim();
      const parsed = parseVariableName(variableName);
      const baseKey = parsed.baseKey;

      // 新的变量名：只保留 baseKey，移除后缀
      const newVariableName = baseKey;

      // 替换文本：只替换 {{ 和 }} 之间的内容
      const before = text.substring(0, startPos);
      const after = text.substring(endPos);
      const newText = `${before}${newVariableName}${after}`;

      // 更新内容
      const currentContent = activeTemplate.content;
      const isMultilingual = typeof currentContent === 'object';
      if (isMultilingual) {
        updateActiveTemplateContent({
          ...currentContent,
          [templateLanguage]: newText
        }, true);
      } else {
        updateActiveTemplateContent(newText, true);
      }

      // 恢复光标位置（调整偏移）
      setTimeout(() => {
        const offset = newVariableName.length - variableName.length;
        const newCursorPos = cursorPos + offset;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
        detectCursorInVariable();
      }, 0);
    }
  }, [cursorInVariable, currentVariableName, currentGroupId, parseVariableName, activeTemplate.content, templateLanguage, updateActiveTemplateContent, detectCursorInVariable]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Poster Mode Auto Scroll Animation with Ping-Pong Effect
  // Poster Mode Auto Scroll - Optimized with requestAnimationFrame
  useEffect(() => {
    if (masonryStyleKey !== 'poster' || !posterScrollRef.current || isPosterAutoScrollPaused || !isDiscoveryView) {
      return;
    }

    const scrollContainer = posterScrollRef.current;
    let scrollDirection = 1; // 1 = down, -1 = up
    const scrollSpeed = 0.5; // 每次滚动的像素数
    let animationFrameId;

    const performScroll = () => {
      if (!scrollContainer) return;

      const currentScroll = scrollContainer.scrollTop;
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;

      // 到达底部，改变方向向上
      if (scrollDirection === 1 && currentScroll >= maxScroll - 1) {
        scrollDirection = -1;
      }
      // 到达顶部，改变方向向下
      else if (scrollDirection === -1 && currentScroll <= 1) {
        scrollDirection = 1;
      }

      // 执行滚动
      scrollContainer.scrollTop += scrollSpeed * scrollDirection;
      animationFrameId = requestAnimationFrame(performScroll);
    };

    animationFrameId = requestAnimationFrame(performScroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [masonryStyleKey, isPosterAutoScrollPaused, isDiscoveryView]);

  // Resizing Logic
  useEffect(() => {
      const handleMouseMove = (e) => {
          if (!isResizing) return;
          // New Layout: Bank Sidebar is on the Right.
          // Width = Window Width - Mouse X
          const newWidth = window.innerWidth - e.clientX;
          
          if (newWidth > 280 && newWidth < 800) { // Min/Max constraints
              setBankSidebarWidth(newWidth);
          }
      };

      const handleMouseUp = () => {
          setIsResizing(false);
          document.body.style.cursor = 'default';
          document.body.style.userSelect = 'auto';
      };

      if (isResizing) {
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none'; // Prevent text selection while resizing
      }

      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing, setBankSidebarWidth]);

  const startResizing = () => {
      setIsResizing(true);
  };

  // --- Template Actions ---

  // 刷新系统模板与词库，保留用户数据
  const handleRefreshSystemData = React.useCallback(() => {
    const backupSuffix = t('refreshed_backup_suffix') || '';
    
    // 迁移旧格式的 selections：将字符串值转换为对象格式
    const migratedTemplates = templates.map(tpl => {
      const newSelections = {};
      Object.entries(tpl.selections || {}).forEach(([key, value]) => {
        if (typeof value === 'string' && banks[key.split('-')[0]]) {
          // 查找对应的词库选项
          const bankKey = key.split('-')[0];
          const bank = banks[bankKey];
          if (bank && bank.options) {
            const matchedOption = bank.options.find(opt => 
              (typeof opt === 'string' && opt === value) ||
              (typeof opt === 'object' && (opt.cn === value || opt.en === value))
            );
            newSelections[key] = matchedOption || value;
          } else {
            newSelections[key] = value;
          }
        } else {
          newSelections[key] = value;
        }
      });
      return { ...tpl, selections: newSelections };
    });
    
    const templateResult = mergeTemplatesWithSystem(migratedTemplates, { backupSuffix });
    const bankResult = mergeBanksWithSystem(banks, defaults, { backupSuffix });

    setTemplates(templateResult.templates);
    setBanks(bankResult.banks);
    setDefaults(bankResult.defaults);
    setActiveTemplateId(prev => templateResult.templates.some(t => t.id === prev) ? prev : "tpl_photo_grid");
    
    // 更新版本号，避免再次提示更新
    setLastAppliedDataVersion(SYSTEM_DATA_VERSION);

    const notes = [...templateResult.notes, ...bankResult.notes];
    if (notes.length > 0) {
      setNoticeMessage(`${t('refresh_done_with_conflicts')}\n- ${notes.join('\n- ')}`);
    } else {
      setNoticeMessage(t('refresh_done_no_conflict'));
    }
  }, [banks, defaults, templates, t]);

  const handleAutoUpdate = () => {
    handleRefreshSystemData();
    setLastAppliedDataVersion(SYSTEM_DATA_VERSION);
    setShowDataUpdateNotice(false);
  };

  // Template Tags Management
  const handleUpdateTemplateTags = (templateId, newTags) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, tags: newTags } : t
    ));
  };

  // eslint-disable-next-line no-unused-vars
  const toggleTag = (tag) => {
    setSelectedTags(prevTag => prevTag === tag ? "" : tag);
  };

  // Base filtered templates (by search and language)
  const baseFilteredTemplates = React.useMemo(() => {
    return templates.filter(t => {
      // Search filter
      const templateName = getLocalized(t.name, language);
      const matchesSearch = !searchQuery || 
        templateName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 语言过滤：如果模板指定了语言，且不包含当前语言，则隐藏
      const templateLangs = t.language ? (Array.isArray(t.language) ? t.language : [t.language]) : ['cn', 'en'];
      const matchesLanguage = templateLangs.includes(language);
      
      return matchesSearch && matchesLanguage;
    });
  }, [templates, searchQuery, language]);

  // Discovery View templates (ignore tags, but respect search, language and sort)
  const discoveryTemplates = React.useMemo(() => {
    return [...baseFilteredTemplates].sort((a, b) => {
      const nameA = getLocalized(a.name, language);
      const nameB = getLocalized(b.name, language);
      switch(sortOrder) {
        case 'newest':
          return templates.indexOf(b) - templates.indexOf(a);
        case 'oldest':
          return templates.indexOf(a) - templates.indexOf(b);
        case 'a-z':
          return nameA.localeCompare(nameB, language === 'cn' ? 'zh-CN' : 'en');
        case 'z-a':
          return nameB.localeCompare(nameA, language === 'cn' ? 'zh-CN' : 'en');
        case 'random': {
          const hashA = (a.id + randomSeed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const hashB = (b.id + randomSeed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return hashA - hashB;
        }
        default:
          return 0;
      }
    });
  }, [baseFilteredTemplates, sortOrder, randomSeed, language, templates]);

  // Filter templates based on tags for sidebar
  const filteredTemplates = React.useMemo(() => {
    return discoveryTemplates.filter(t => {
      // Search filter
      const query = searchQuery.toLowerCase();
      const name = typeof t.name === 'object' ? Object.values(t.name).join(' ') : t.name;
      const content = typeof t.content === 'object' ? Object.values(t.content).join(' ') : t.content;
      const matchesSearch = query === "" || 
        name.toLowerCase().includes(query) || 
        content.toLowerCase().includes(query);

      // Tag filter
      const matchesTags = selectedTags === "" || 
        (t.tags && t.tags.includes(selectedTags));
      
      // Type filter (image / video)
      const matchesType = selectedType === "all" ||
        (selectedType === "video" && t.type === "video") ||
        (selectedType === "image" && t.type !== "video");

      // Library filter
      const isOfficial = INITIAL_TEMPLATES_CONFIG.some(cfg => cfg.id === t.id);
      const matchesLibrary = selectedLibrary === "all" || 
        (selectedLibrary === "official" && isOfficial) ||
        (selectedLibrary === "personal" && !isOfficial);

      return matchesSearch && matchesTags && matchesType && matchesLibrary;
    });
  }, [discoveryTemplates, selectedTags, selectedType, selectedLibrary, searchQuery]);

  // Compute available tags based on current type + library filters (ignoring tag filter itself)
  const availableTags = React.useMemo(() => {
    const tagsWithTemplates = new Set();
    discoveryTemplates.forEach(t => {
      // Apply type filter
      const matchesType = selectedType === "all" ||
        (selectedType === "video" && t.type === "video") ||
        (selectedType === "image" && t.type !== "video");
      // Apply library filter
      const isOfficial = INITIAL_TEMPLATES_CONFIG.some(cfg => cfg.id === t.id);
      const matchesLibrary = selectedLibrary === "all" || 
        (selectedLibrary === "official" && isOfficial) ||
        (selectedLibrary === "personal" && !isOfficial);
      
      if (matchesType && matchesLibrary && t.tags) {
        t.tags.forEach(tag => tagsWithTemplates.add(tag));
      }
    });
    return TEMPLATE_TAGS.filter(tag => tagsWithTemplates.has(tag));
  }, [discoveryTemplates, selectedType, selectedLibrary]);

  // Auto-reset selected tag when it becomes unavailable
  React.useEffect(() => {
    if (selectedTags !== "" && !availableTags.includes(selectedTags)) {
      setSelectedTags("");
    }
  }, [availableTags, selectedTags]);

  const fileInputRef = useRef(null);
  
  const handleUploadImage = (e) => {
      try {
          const file = e.target.files?.[0];
          if (!file) return;
          
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');

          // 验证文件类型
          if (!isImage && !isVideo) {
              if (storageMode === 'browser') {
                  alert('请选择图片或视频文件');
              }
              return;
          }

          // 容量控制：图片 10MB, 视频 50MB (Base64 会增加约 33% 体积)
          const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
          const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
          
          if (isImage && file.size > MAX_IMAGE_SIZE) {
              alert(`图片大小不能超过 10MB (当前: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
              return;
          }
          if (isVideo && file.size > MAX_VIDEO_SIZE) {
              alert(`视频大小不能超过 50MB (当前: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
              return;
          }
          
          const reader = new FileReader();
          
          reader.onloadend = () => {
              try {
                  setTemplates(prev => prev.map(t => {
                      if (t.id !== activeTemplateId) return t;
                      
                      if (imageUpdateMode === 'add') {
                        const newUrls = [...(t.imageUrls || [t.imageUrl]), reader.result];
                        return { ...t, imageUrls: newUrls, imageUrl: newUrls[0] };
                      } else if (imageUpdateMode === 'add_source') {
                        // 新增：向 source 数组中添加图片或视频素材
                        const type = isVideo ? 'video' : 'image';
                        const newSources = [...(t.source || []), { type, url: reader.result }];
                        return { ...t, source: newSources };
                      } else if (imageUpdateMode === 'replace_video_url') {
                        // 新增：更新视频模板的视频成果链接
                        setTempVideoUrl(reader.result);
                        return { ...t, videoUrl: reader.result };
                      } else if (imageUpdateMode === 'replace_cover') {
                        // 更新视频模板的封面图
                        return { ...t, imageUrl: reader.result };
                      } else {
                        // Replace current index
                        if (t.imageUrls && Array.isArray(t.imageUrls)) {
                          const newUrls = [...t.imageUrls];
                          newUrls[currentImageEditIndex] = reader.result;
                          return { ...t, imageUrls: newUrls, imageUrl: newUrls[0] };
                        }
                        return { ...t, imageUrl: reader.result };
                      }
                  }));
              } catch (error) {
                  console.error('图片上传失败:', error);
                  if (error.name === 'QuotaExceededError') {
                      console.error('存储空间不足！图片过大。建议使用图片链接方式或切换到本地文件夹模式。');
                  } else {
                      alert('图片上传失败，请重试');
                  }
              }
          };
          
          reader.onerror = () => {
              console.error('文件读取失败');
              if (storageMode === 'browser') {
                  alert('文件读取失败，请重试');
              }
          };
          
          reader.readAsDataURL(file);
      } catch (error) {
          console.error('上传图片出错:', error);
          if (storageMode === 'browser') {
              alert('上传图片出错，请重试');
          }
      } finally {
          // 重置input，允许重复选择同一文件
          if (e.target) {
              e.target.value = '';
          }
      }
  };

  const handleResetImage = () => {
      const defaultUrl = INITIAL_TEMPLATES_CONFIG.find(t => t.id === activeTemplateId)?.imageUrl;
      const defaultUrls = INITIAL_TEMPLATES_CONFIG.find(t => t.id === activeTemplateId)?.imageUrls;
      
      setTemplates(prev => prev.map(t => 
          t.id === activeTemplateId ? { ...t, imageUrl: defaultUrl, imageUrls: defaultUrls } : t
      ));
  };

  const handleDeleteImage = React.useCallback((index) => {
      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplateId) return t;
          
          const targetIndex = index !== undefined ? index : currentImageEditIndex;
          
          if (t.imageUrls && Array.isArray(t.imageUrls) && t.imageUrls.length > 1) {
              const newUrls = t.imageUrls.filter((_, idx) => idx !== targetIndex);
              return { 
                  ...t, 
                  imageUrls: newUrls, 
                  imageUrl: newUrls[0] // 默认切回第一张
              };
          } else {
              // 只有一张图时，清除图片
              return { ...t, imageUrl: "", imageUrls: [] };
          }
      }));
      setCurrentImageEditIndex(0);
  }, [activeTemplateId, currentImageEditIndex, setTemplates, setCurrentImageEditIndex]);

  const requestDeleteImage = React.useCallback((e, index) => {
    if (e) e.stopPropagation();
    const targetIndex = index !== undefined ? index : currentImageEditIndex;
    openActionConfirm({
      title: language === 'cn' ? '删除图片' : 'Delete Image',
      message: language === 'cn' ? '确定要删除这张图片吗？' : 'Delete this image?',
      confirmText: language === 'cn' ? '删除' : 'Delete',
      cancelText: language === 'cn' ? '取消' : 'Cancel',
      onConfirm: () => handleDeleteImage(targetIndex),
    });
  }, [language, handleDeleteImage, openActionConfirm, currentImageEditIndex]);

  const handleSetImageUrl = () => {
      if (!imageUrlInput.trim()) return;
      
      setTemplates(prev => prev.map(t => {
          if (t.id !== activeTemplateId) return t;
          
          if (imageUpdateMode === 'replace_video_url') {
            // 更新视频模板的视频成果链接
            setTempVideoUrl(imageUrlInput);
            return { ...t, videoUrl: imageUrlInput };
          } else if (imageUpdateMode === 'replace_cover') {
            // 更新视频模板的封面图
            return { ...t, imageUrl: imageUrlInput };
          } else if (imageUpdateMode === 'add') {
            const newUrls = [...(t.imageUrls || [t.imageUrl]), imageUrlInput];
            return { ...t, imageUrls: newUrls, imageUrl: newUrls[0] };
          } else if (imageUpdateMode === 'add_source') {
            // 向 source 数组中添加 URL 素材，自动判断视频/图片类型
            const isVideoUrl = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(imageUrlInput) ||
              /youtube\.com|youtu\.be|bilibili\.com|player\.bilibili\.com/i.test(imageUrlInput);
            const type = isVideoUrl ? 'video' : 'image';
            const newSources = [...(t.source || []), { type, url: imageUrlInput }];
            return { ...t, source: newSources };
          } else {
            // Replace current index
            if (t.imageUrls && Array.isArray(t.imageUrls)) {
              const newUrls = [...t.imageUrls];
              newUrls[currentImageEditIndex] = imageUrlInput;
              return { ...t, imageUrls: newUrls, imageUrl: newUrls[0] };
            }
            return { ...t, imageUrl: imageUrlInput };
          }
      }));
      setImageUrlInput("");
      setShowImageUrlInput(false);
  };

  // --- 导出/导入功能 ---
  const handleExportTemplate = async (template) => {
      try {
          const templateName = getLocalized(template.name, language);
          const dataStr = JSON.stringify(template, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const filename = `${templateName.replace(/\s+/g, '_')}_template.json`;
          
          // 检测是否为移动设备（尤其是iOS）
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          if (isMobileDevice && navigator.share) {
              // 移动端：使用 Web Share API
              try {
                  const file = new File([dataBlob], filename, { type: 'application/json' });
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                          files: [file],
                          title: templateName,
                          text: '导出的提示词模板'
                      });
                      setNoticeMessage('✅ 模板已分享/保存');
                      return;
                  }
              } catch (shareError) {
                  console.log('Web Share API 失败，使用降级方案', shareError);
              }
          }
          
          // 桌面端或降级方案：使用传统下载方式
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          
          // iOS Safari 特殊处理
          if (isIOS) {
              link.target = '_blank';
          }
          
          document.body.appendChild(link);
          link.click();
          
          // 延迟清理，确保iOS有足够时间处理
          setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
          }, 100);
          
          setNoticeMessage('✅ 模板已导出');
      } catch (error) {
          console.error('导出失败:', error);
          alert('导出失败，请重试');
      }
  };

  const handleExportAllTemplates = async (selectedIds = null) => {
      try {
          const exportTemplates = selectedIds
            ? templates.filter(t => selectedIds.includes(t.id))
            : templates;

          if (!exportTemplates.length) {
            setNoticeMessage(language === 'cn' ? '请选择至少一个模版' : 'Select at least one template');
            return;
          }

          const exportData = {
              templates: exportTemplates,
              banks,
              categories,
              version: 'v9',
              exportDate: new Date().toISOString()
          };
          const dataStr = JSON.stringify(exportData, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const filename = `prompt_fill_backup_${Date.now()}.json`;
          
          // 检测是否为移动设备（尤其是iOS）
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          if (isMobileDevice && navigator.share) {
              // 移动端：使用 Web Share API
              try {
                  const file = new File([dataBlob], filename, { type: 'application/json' });
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                          files: [file],
                          title: '提示词填空器备份',
                          text: '所有模板和词库的完整备份'
                      });
                      setNoticeMessage(language === 'cn' ? '✅ 备份已分享/保存' : '✅ Backup shared/saved');
                      return;
                  }
              } catch (shareError) {
                  console.log('Web Share API 失败，使用降级方案', shareError);
              }
          }
          
          // 桌面端或降级方案：使用传统下载方式
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          
          // iOS Safari 特殊处理
          if (isIOS) {
              link.target = '_blank';
          }
          
          document.body.appendChild(link);
          link.click();
          
          // 延迟清理，确保iOS有足够时间处理
          setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
          }, 100);
          
          setNoticeMessage(language === 'cn' ? '✅ 备份已导出' : '✅ Backup exported');
      } catch (error) {
          console.error('导出失败:', error);
          setNoticeMessage(language === 'cn' ? '导出失败，请重试' : 'Export failed, please retry');
      }
  };

  const handleImportTemplate = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = JSON.parse(e.target.result);
              
              // 检查是单个模板还是完整备份
              if (data.templates && Array.isArray(data.templates)) {
                  // 完整备份
                  if (window.confirm('检测到完整备份文件。是否要覆盖当前所有数据？')) {
                      setTemplates(data.templates);
                      if (data.banks) setBanks(data.banks);
                      if (data.categories) setCategories(data.categories);
                      alert('导入成功！');
                  }
              } else if (data.id && data.name) {
                  // 单个模板
                  const newId = `tpl_${Date.now()}`;
                  const newTemplate = { ...data, id: newId };
                  setTemplates(prev => [...prev, newTemplate]);
                  setActiveTemplateId(newId);
                  alert('模板导入成功！');
              } else {
                  alert('文件格式不正确');
              }
          } catch (error) {
              console.error('导入失败:', error);
              alert('导入失败，请检查文件格式');
          }
      };
      reader.readAsText(file);
      
      // 重置input
      event.target.value = '';
  };

  // --- File System Access API Functions ---
  const handleSelectDirectory = async () => {
      try {
          if (!isFileSystemSupported) {
              alert(t('browser_not_supported'));
              return;
          }

          const handle = await window.showDirectoryPicker({
              mode: 'readwrite',
              startIn: 'documents'
          });
          
          setDirectoryHandle(handle);
          setStorageMode('folder');
          localStorage.setItem('app_storage_mode', 'folder');
          
          // Save handle to IndexedDB for future use
          await saveDirectoryHandle(handle);
          
          // 尝试保存当前数据到文件夹
          await saveToFileSystem(handle);
          alert(t('auto_save_enabled'));
      } catch (error) {
          console.error('选择文件夹失败:', error);
          if (error.name !== 'AbortError') {
              alert(t('folder_access_denied'));
          }
      }
  };

  const saveToFileSystem = async (handle) => {
      if (!handle) return;
      
      try {
          const data = {
              templates,
              banks,
              categories,
              defaults,
              version: 'v9',
              lastSaved: new Date().toISOString()
          };
          
          const fileHandle = await handle.getFileHandle('prompt_fill_data.json', { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          
          console.log('数据已保存到本地文件夹');
      } catch (error) {
          console.error('保存到文件系统失败:', error);
      }
  };

  const loadFromFileSystem = async (handle) => {
      if (!handle) return;
      
      try {
          const fileHandle = await handle.getFileHandle('prompt_fill_data.json');
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          
          if (data.templates) setTemplates(data.templates);
          if (data.banks) setBanks(data.banks);
          if (data.categories) setCategories(data.categories);
          if (data.defaults) setDefaults(data.defaults);
          
          console.log('从本地文件夹加载数据成功');
      } catch (error) {
          console.error('从文件系统读取失败:', error);
      }
  };

  // Auto-save to file system when data changes
  useEffect(() => {
      if (storageMode === 'folder' && directoryHandle) {
          const timeoutId = setTimeout(() => {
              saveToFileSystem(directoryHandle);
          }, 1000); // Debounce 1 second
          
          return () => clearTimeout(timeoutId);
      }
  }, [templates, banks, categories, defaults, storageMode, directoryHandle]);

  // 存储空间管理
  // eslint-disable-next-line no-unused-vars
  const getStorageSize = () => {
      try {
          let total = 0;
          for (let key in localStorage) {
              if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                  total += localStorage[key].length + key.length;
              }
          }
          return (total / 1024).toFixed(2); // KB
      } catch (error) {
          return '0';
      }
  };

  function handleClearAllData() {
      try {
          // 只清除应用相关的数据
          const keysToRemove = Object.keys(localStorage).filter(key => 
              key.startsWith('app_')
          );
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // 刷新页面
          window.location.reload();
      } catch (error) {
          console.error('清除数据失败:', error);
          setNoticeMessage(language === 'cn' ? '清除数据失败' : 'Failed to clear data');
      }
  }

  function handleCompleteBackup() {
    handleExportAllTemplates();
  }

  function handleImportAllData(event) {
    handleImportTemplate(event);
  }

  function handleResetSystemData() {
      localStorage.removeItem('app_templates');
      localStorage.removeItem('app_banks');
      localStorage.removeItem('app_categories');
      window.location.reload();
  }

  const requestClearAllData = React.useCallback(() => {
    openActionConfirm({
      title: language === 'cn' ? '清空数据' : 'Clear All Data',
      message: t('confirm_clear_all'),
      confirmText: language === 'cn' ? '清空' : 'Clear',
      cancelText: language === 'cn' ? '取消' : 'Cancel',
      onConfirm: handleClearAllData
    });
  }, [language, t, handleClearAllData, openActionConfirm]);

  // eslint-disable-next-line no-unused-vars
  const requestResetSystemData = React.useCallback(() => {
    openActionConfirm({
      title: language === 'cn' ? '重置系统数据' : 'Reset System Data',
      message: language === 'cn' ? '确定要重置系统数据吗？这将清除所有本地修改并重新从系统加载初始模板。' : 'Reset system data? This will clear local changes and reload defaults.',
      confirmText: language === 'cn' ? '重置' : 'Reset',
      cancelText: language === 'cn' ? '取消' : 'Cancel',
      onConfirm: handleResetSystemData
    });
  }, [language, openActionConfirm]);
  
  const handleSwitchToLocalStorage = async () => {
      setStorageMode('browser');
      setDirectoryHandle(null);
      localStorage.setItem('app_storage_mode', 'browser');
      
      // Clear directory handle from IndexedDB
      try {
          const { openDB: getDb } = await import('./utils/db');
          const dexieDb = await getDb();
          await dexieDb.table('handles').delete('directory');
      } catch (error) {
          console.error('清除文件夹句柄失败:', error);
      }
  };
  
  // eslint-disable-next-line no-unused-vars
  const handleManualLoadFromFolder = async () => {
      if (directoryHandle) {
          try {
              await loadFromFileSystem(directoryHandle);
              alert('从文件夹加载成功！');
          } catch (error) {
              alert('从文件夹加载失败，请检查文件是否存在');
          }
      }
  };

  // 以下函数已移至自定义 Hooks:
  // - updateActiveTemplateContent -> useEditorHistory
  // - handleUndo, handleRedo -> useEditorHistory
  // - parseVariableName -> useLinkageGroups
  // - detectCursorInVariable -> 需要在组件中重新实现（使用 Hook 返回的状态设置器）
  // - handleSetGroup, handleRemoveGroup -> 需要在组件中重新实现
  // - findLinkedVariables -> useLinkageGroups
  // - updateActiveTemplateSelection -> useLinkageGroups
  // - handleSelect -> useLinkageGroups
  // - handleAddCustomAndSelect -> useLinkageGroups

  // handleAddOption 和 handleDeleteOption 已移至 Hook 调用之前（第 943 行）

  const handleStartAddBank = (catId) => {
    setNewBankCategory(catId);
    setIsAddingBank(true);
  };

  const handleAddBank = () => {
    if (!newBankLabel.trim() || !newBankKey.trim()) return;
    const safeKey = newBankKey.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    
    if (banks[safeKey]) {
      alert(t('alert_id_exists'));
      return;
    }

    setBanks(prev => ({
      ...prev,
      [safeKey]: {
        label: newBankLabel,
        category: newBankCategory,
        options: []
      }
    }));
    setDefaults(prev => ({ ...prev, [safeKey]: "" }));
    setNewBankLabel("");
    setNewBankKey("");
    setNewBankCategory("other");
    setIsAddingBank(false);
  };

  const handleDeleteBank = (key) => {
    const bankLabel = getLocalized(banks[key].label, language);
    if (window.confirm(t('confirm_delete_bank', { name: bankLabel }))) {
      const newBanks = { ...banks };
      delete newBanks[key];
      setBanks(newBanks);
    }
  };

  const handleUpdateBankCategory = (key, newCategory) => {
      setBanks(prev => ({
          ...prev,
          [key]: {
              ...prev[key],
              category: newCategory
          }
      }));
  };

  // --- Editor Actions ---

  const insertVariableToTemplate = (key, dropPoint = null) => {
    const textToInsert = ` {{${key}}} `;
    const currentContent = activeTemplate.content || "";
    const isMultilingual = typeof currentContent === 'object';
    const text = isMultilingual ? (currentContent[templateLanguage] || "") : currentContent;

    if (!isEditing) {
      handleStartEditing();
      setTimeout(() => {
        const updatedText = text + textToInsert;
        if (isMultilingual) {
          updateActiveTemplateContent({ ...currentContent, [templateLanguage]: updatedText }, true);
        } else {
          updateActiveTemplateContent(updatedText, true);
        }
        if(textareaRef.current) textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }, 50);
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;

    // 移动端模拟拖拽的特殊处理：计算落点位置
    if (dropPoint) {
      const { x, y } = dropPoint;
      let range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      } else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      
      if (range && range.startContainer) {
        // 对于 textarea，我们需要手动计算偏移，这很困难
        // 简化方案：如果在 textarea 区域内释放，则插入到最后或保持当前光标
        // 但如果是在编辑器内，我们通常已经聚焦了
      }
    }

    const safeText = String(text);
    const before = safeText.substring(0, start);
    const after = safeText.substring(end, safeText.length);
    const updatedText = `${before}${textToInsert}${after}`;
    
    if (isMultilingual) {
      updateActiveTemplateContent({ ...currentContent, [templateLanguage]: updatedText }, true);
    } else {
      updateActiveTemplateContent(updatedText, true);
    }
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + textToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleCopy = () => {
    // 获取当前模板语言的内容
    let finalString = getLocalized(activeTemplate.content, templateLanguage);
    const counters = {};

    finalString = finalString.replace(/{{(.*?)}}/g, (match, key) => {
        const fullKey = key.trim();
        const parsed = parseVariableName(fullKey);
        const baseKey = parsed.baseKey;
        
        // 使用完整的 fullKey 作为计数器的 key
        const idx = counters[fullKey] || 0;
        counters[fullKey] = idx + 1;

        const uniqueKey = `${fullKey}-${idx}`;
        // Prioritize selection, then default (use baseKey for defaults), and get localized value
        const value = activeTemplate.selections[uniqueKey] || defaults[baseKey];
        return getLocalized(value, templateLanguage) || match;
    });

    let cleanText = finalString
        .replace(/###\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\n\s*\n/g, '\n\n');

    copyToClipboard(cleanText).then((success) => {
      if (success) {
        setCopied(true);
        setIsCopySuccessModalOpen(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };


  // 移动端模拟拖拽处理器
  const onTouchDragStart = (key, x, y) => {
    setTouchDraggingVar({ key, x, y });
    setIsBanksDrawerOpen(false); // 开始拖拽立刻收起抽屉
  };

  const onTouchDragMove = (x, y) => {
    if (touchDraggingVar) {
      setTouchDraggingVar(prev => ({ ...prev, x, y }));
    }
  };

  const onTouchDragEnd = (x, y) => {
    if (touchDraggingVar) {
      insertVariableToTemplate(touchDraggingVar.key, { x, y });
      setTouchDraggingVar(null);
    }
  };

  // --- Renderers ---

  const globalContainerStyle = isDarkMode ? {
    borderRadius: '16px',
    border: '1px solid transparent',
    backgroundImage: 'linear-gradient(180deg, #3B3B3B, #242120), linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  } : {
    borderRadius: '16px',
    border: '1px solid transparent',
    backgroundImage: 'linear-gradient(180deg, #FAF5F1, #F6EBE6), linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  };

  if (!isTemplatesLoaded || !isBanksLoaded || !isCategoriesLoaded || !isDefaultsLoaded) {
    return (
      <div className={`flex items-center justify-center h-screen w-screen ${isDarkMode ? 'bg-[#181716] text-white' : 'bg-[#FAF5F1] text-gray-800'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium opacity-70">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen h-[100dvh] w-screen overflow-hidden p-0 md:p-4 ${isDarkMode ? 'dark-mode dark-gradient-bg' : 'mesh-gradient-bg'}`}
      onTouchMove={(e) => touchDraggingVar && onTouchDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={(e) => touchDraggingVar && onTouchDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
    >
      {/* 桌面端全局侧边栏 - 位置固定不动 */}
      {!isMobileDevice && (
        <>
          <Sidebar
            activeTab={isSettingPage ? 'settings' : (showDiscoveryOverlay ? 'home' : 'details')}
            onHome={() => {
              handleSetDiscoveryView(true);
            }}
            onDetail={() => {
              handleSetDiscoveryView(false);
            }}
            isSortMenuOpen={isSortMenuOpen}
            setIsSortMenuOpen={setIsSortMenuOpen}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            setRandomSeed={setRandomSeed}
            onRefresh={handleRefreshSystemData}
            language={language}
            setLanguage={setLanguage}
            isDarkMode={isDarkMode}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            t={t}
          />
          
          {/* 趣味设计：暗号模式下拉灯效果 */}
          <div 
            className={`hidden md:block fixed top-0 left-[-24px] z-[500] pointer-events-none transition-all duration-700 ease-in-out ${
              isDarkMode ? 'translate-y-0 opacity-100 delay-0' : '-translate-y-full opacity-0 delay-[300ms]'
            }`}
            style={{ width: '220px' }}
          >
            {/* 精准感应区：仅 32px 宽，处于灯体中心 */}
            <div 
              className="absolute left-[94px] top-0 h-full w-[32px] cursor-pointer pointer-events-auto z-10"
              onClick={() => setIsLampOn(!isLampOn)}
              onMouseMove={handleLampMouseMove}
              onMouseLeave={() => {
                setLampRotation(0);
                setIsLampHovered(false);
              }}
            />
            
            <div 
              style={{ 
                transformOrigin: '50% 0',
                transform: `rotate(${lampRotation}deg)`,
                transition: isLampHovered ? 'transform 0.1s ease-out' : 'transform 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <img src="/lamp.png" alt="Dark Mode Lamp" className={`w-full h-auto drop-shadow-2xl transition-all duration-500 ${!isLampOn ? 'brightness-50' : 'brightness-100'}`} />
            </div>
          </div>

          {/* 趣味设计：光照效果 */}
          <div 
            className={`hidden md:block fixed pointer-events-none transition-opacity ease-in-out ${
              isDarkMode 
                ? (isLampOn ? 'opacity-[0.28] duration-500 delay-[900ms]' : 'opacity-[0.05] duration-500 delay-0') 
                : 'opacity-0 duration-300 delay-0'
            }`}
            style={{
              left: '-286px',
              top: '58px',
              width: '815px',
              height: '731px',
              background: 'linear-gradient(180deg, #FFD09D 5%, rgba(216, 216, 216, 0) 100%)',
              filter: 'blur(286px)',
              mixBlendMode: 'lighten',
              zIndex: 499
            }}
          />
        </>
      )}

      {/* 移动端拖拽浮层 */}
      {touchDraggingVar && (
        <div 
          className="fixed z-[9999] pointer-events-none px-3 py-1.5 bg-orange-500 text-white rounded-lg shadow-2xl text-xs font-bold font-mono animate-in zoom-in-50 duration-200"
          style={{ 
            left: touchDraggingVar.x, 
            top: touchDraggingVar.y, 
            transform: 'translate(-50%, -150%)',
            boxShadow: '0 0 20px rgba(249,115,22,0.4)'
          }}
        >
          {` {{${touchDraggingVar.key}}} `}
        </div>
      )}
      
      {/* 主视图区域 */}
      <div className="flex-1 relative flex overflow-hidden">
        {isSettingPage || (isMobileDevice && mobileTab === 'settings') ? (
          isMobileDevice ? (
            <MobileSettingsView
              language={language}
              setLanguage={setLanguage}
              storageMode={storageMode}
              setStorageMode={setStorageMode}
              directoryHandle={directoryHandle}
              handleImportTemplate={handleImportTemplate}
              handleExportAllTemplates={openExportModal}
              handleCompleteBackup={handleCompleteBackup}
              handleImportAllData={handleImportAllData}
              handleResetSystemData={handleRefreshSystemData}
              handleClearAllData={requestClearAllData}
              SYSTEM_DATA_VERSION={SYSTEM_DATA_VERSION}
              t={t}
              isDarkMode={isDarkMode}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
            iCloudEnabled={iCloudEnabled}
            setICloudEnabled={setICloudEnabled}
            lastICloudSyncAt={lastICloudSyncAt}
            lastICloudSyncError={lastICloudSyncError}
            />
          ) : (
            <SettingsView
              language={language}
              setLanguage={setLanguage}
              storageMode={storageMode}
              setStorageMode={setStorageMode}
              directoryHandle={directoryHandle}
              handleImportTemplate={handleImportTemplate}
              handleExportAllTemplates={openExportModal}
              handleResetSystemData={handleRefreshSystemData}
              handleClearAllData={requestClearAllData}
              handleSelectDirectory={handleSelectDirectory}
              handleSwitchToLocalStorage={handleSwitchToLocalStorage}
              SYSTEM_DATA_VERSION={SYSTEM_DATA_VERSION}
              t={t}
              globalContainerStyle={globalContainerStyle}
              isDarkMode={isDarkMode}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
                  iCloudEnabled={iCloudEnabled}
                  setICloudEnabled={setICloudEnabled}
                  lastICloudSyncAt={lastICloudSyncAt}
                  lastICloudSyncError={lastICloudSyncError}
            />
          )
        ) : showDiscoveryOverlay ? (
          <DiscoveryView
            filteredTemplates={filteredTemplates}
            setActiveTemplateId={handleSetActiveTemplateId}
            setDiscoveryView={handleSetDiscoveryView}
            setZoomedImage={setZoomedImage}
            posterScrollRef={posterScrollRef}
            setIsPosterAutoScrollPaused={setIsPosterAutoScrollPaused}
            currentMasonryStyle={MASONRY_STYLES[masonryStyleKey]}
            masonryStyleKey={masonryStyleKey}
            AnimatedSlogan={isMobileDevice ? MobileAnimatedSlogan : AnimatedSlogan}
            isSloganActive={!zoomedImage}
            t={t}
            TAG_STYLES={TAG_STYLES}
            displayTag={displayTag}
            handleRefreshSystemData={handleRefreshSystemData}
            language={language}
            setLanguage={setLanguage}
            isDarkMode={isDarkMode}
            isSortMenuOpen={isSortMenuOpen}
            setIsSortMenuOpen={setIsSortMenuOpen}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            setRandomSeed={setRandomSeed}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            globalContainerStyle={globalContainerStyle}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            templates={templates}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            selectedLibrary={selectedLibrary}
            setSelectedLibrary={setSelectedLibrary}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            handleAddTemplate={handleAddTemplate}
            TEMPLATE_TAGS={TEMPLATE_TAGS}
            availableTags={availableTags}
          />
        ) : (
          <div className="flex-1 flex gap-2 lg:gap-4 overflow-hidden">
            {/* Tag Sidebar - 仅在桌面端显示 */}
            {!isMobileDevice && (
              <TagSidebar
                TEMPLATE_TAGS={TEMPLATE_TAGS}
                availableTags={availableTags}
                selectedTags={selectedTags}
                selectedLibrary={selectedLibrary}
                selectedType={selectedType}
                setSelectedTags={setSelectedTags}
                setSelectedLibrary={setSelectedLibrary}
                setSelectedType={setSelectedType}
                isDarkMode={isDarkMode}
                language={language}
              />
            )}

            <TemplatesSidebar
              mobileTab={mobileTab}
              isTemplatesDrawerOpen={isTemplatesDrawerOpen}
              setIsTemplatesDrawerOpen={setIsTemplatesDrawerOpen}
              setDiscoveryView={handleSetDiscoveryView}
              activeTemplateId={activeTemplateId}
              setActiveTemplateId={handleSetActiveTemplateId}
              filteredTemplates={filteredTemplates}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleRefreshSystemData={handleRefreshSystemData}
              language={language}
              setLanguage={setLanguage}
              isDarkMode={isDarkMode}
              t={t}
              isSortMenuOpen={isSortMenuOpen}
              setIsSortMenuOpen={setIsSortMenuOpen}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              setRandomSeed={setRandomSeed}
              handleResetTemplate={requestResetTemplate}
              startRenamingTemplate={startRenamingTemplate}
              handleDuplicateTemplate={handleDuplicateTemplate}
              handleExportTemplate={handleExportTemplate}
            handleDeleteTemplate={requestDeleteTemplate}
            handleAddTemplate={handleAddTemplate}
            handleManualTokenImport={handleManualTokenImport}
            setShowImportTokenModal={setShowImportTokenModal}
            INITIAL_TEMPLATES_CONFIG={INITIAL_TEMPLATES_CONFIG}
              editingTemplateNameId={editingTemplateNameId}
              tempTemplateName={tempTemplateName}
              setTempTemplateName={setTempTemplateName}
              tempTemplateAuthor={tempTemplateAuthor}
              setTempTemplateAuthor={setTempTemplateAuthor}
              saveTemplateName={saveTemplateName}
              setEditingTemplateNameId={setEditingTemplateNameId}
              globalContainerStyle={globalContainerStyle}
            />

            {/* --- 2. Main Editor (Middle) --- */}
            <TemplateEditor
              // ===== 模板数据 =====
              activeTemplate={activeTemplate}
              templates={templates}
              setActiveTemplateId={handleSetActiveTemplateId}
              setSourceZoomedItem={setSourceZoomedItem}
              banks={banks}
              defaults={defaults}
              categories={categories}
              INITIAL_TEMPLATES_CONFIG={INITIAL_TEMPLATES_CONFIG}
              TEMPLATE_TAGS={TEMPLATE_TAGS}
              TAG_STYLES={TAG_STYLES}

              // ===== 语言相关 =====
              language={language}
              templateLanguage={templateLanguage}
              setTemplateLanguage={setTemplateLanguage}

              // ===== 编辑模式状态 =====
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              handleStartEditing={handleStartEditing}
              handleStopEditing={handleStopEditing}

              // ===== 历史记录 =====
              historyPast={historyPast}
              historyFuture={historyFuture}
              handleUndo={handleUndo}
              handleRedo={handleRedo}

              // ===== 联动组 =====
              cursorInVariable={cursorInVariable}
              currentGroupId={currentGroupId}
              handleSetGroup={handleSetGroup}
              handleRemoveGroup={handleRemoveGroup}

              // ===== 变量交互 =====
              activePopover={activePopover}
              setActivePopover={setActivePopover}
              handleSelect={handleSelect}
              handleAddCustomAndSelect={handleAddCustomAndSelect}
              popoverRef={popoverRef}

              // ===== 标题编辑 =====
              editingTemplateNameId={editingTemplateNameId}
              tempTemplateName={tempTemplateName}
              setTempTemplateName={setTempTemplateName}
              saveTemplateName={saveTemplateName}
              startRenamingTemplate={startRenamingTemplate}
              setEditingTemplateNameId={setEditingTemplateNameId}
              tempTemplateAuthor={tempTemplateAuthor}
              setTempTemplateAuthor={setTempTemplateAuthor}
              tempTemplateBestModel={tempTemplateBestModel}
              setTempTemplateBestModel={setTempTemplateBestModel}
              tempTemplateBaseImage={tempTemplateBaseImage}
              setTempTemplateBaseImage={setTempTemplateBaseImage}
              tempVideoUrl={tempVideoUrl}
              setTempVideoUrl={setTempVideoUrl}

              // ===== 标签编辑 =====
              handleUpdateTemplateTags={handleUpdateTemplateTags}
              editingTemplateTags={editingTemplateTags}
              setEditingTemplateTags={setEditingTemplateTags}

              // ===== 图片管理 =====
              fileInputRef={fileInputRef}
              setShowImageUrlInput={setShowImageUrlInput}
              handleResetImage={handleResetImage}
              requestDeleteImage={requestDeleteImage}
              setImageUpdateMode={setImageUpdateMode}
              setCurrentImageEditIndex={setCurrentImageEditIndex}

              // ===== 分享/导出/复制 =====
              handleShareLink={handleShareLink}
              handleExportImage={handleExportImage}
              isExporting={isExporting}
              handleCopy={handleCopy}
              copied={copied}

              // ===== 模态框 =====
              setIsInsertModalOpen={setIsInsertModalOpen}

              // ===== 其他 =====
              updateActiveTemplateContent={updateActiveTemplateContent}
              setZoomedImage={setZoomedImage}
              t={t}
              isDarkMode={isDarkMode}
              isMobileDevice={isMobileDevice}
              mobileTab={mobileTab}
              textareaRef={textareaRef}
              // AI 相关
              onGenerateAITerms={handleGenerateAITerms}
              onSmartSplitClick={handleSmartSplit}
              isSmartSplitLoading={isSmartSplitLoading}
              updateTemplateProperty={updateTemplateProperty}
              setIsTemplatesDrawerOpen={setIsTemplatesDrawerOpen}
              setIsBanksDrawerOpen={setIsBanksDrawerOpen}
            />


            {/* Image/Video URL Input Modal */}
            <ImageUrlModal
              isOpen={showImageUrlInput}
              onClose={() => { setShowImageUrlInput(false); setImageUrlInput(''); }}
              imageUrlInput={imageUrlInput}
              setImageUrlInput={setImageUrlInput}
              onConfirm={handleSetImageUrl}
              templateType={activeTemplate?.type}
              t={t}
              language={language}
              isDarkMode={isDarkMode}
            />

            <BanksSidebar 
              mobileTab={mobileTab}
              isBanksDrawerOpen={isBanksDrawerOpen}
              setIsBanksDrawerOpen={setIsBanksDrawerOpen}
              bankSidebarWidth={bankSidebarWidth}
              sidebarRef={sidebarRef}
              startResizing={startResizing}
              setIsCategoryManagerOpen={setIsCategoryManagerOpen}
              categories={categories}
              banks={banks}
              insertVariableToTemplate={insertVariableToTemplate}
              handleDeleteOption={handleDeleteOption}
              handleAddOption={handleAddOption}
              handleUpdateOption={handleUpdateOption}
              handleDeleteBank={handleDeleteBank}
              handleUpdateBankCategory={handleUpdateBankCategory}
              handleStartAddBank={handleStartAddBank}
              t={t}
              language={templateLanguage}
              isDarkMode={isDarkMode}
              onTouchDragStart={onTouchDragStart}
              globalContainerStyle={globalContainerStyle}
            />
          </div>
        )}
      </div>
      <ShareImportModal
        isOpen={showShareImportModal}
        templateData={sharedTemplateData}
        onClose={() => setShowShareImportModal(false)}
        onImport={handleImportSharedTemplate}
        t={t}
        TAG_STYLES={TAG_STYLES}
        displayTag={displayTag}
        isDarkMode={isDarkMode}
        language={language}
      />
      <ShareOptionsModal
        isOpen={showShareOptionsModal && !!activeTemplate}
        onClose={() => setShowShareOptionsModal(false)}
        onCopyLink={doCopyShareLink}
        onCopyToken={handleShareToken}
        shareUrl={currentShareUrl}
        shareCode={prefetchedShortCode}
        isGenerating={isGenerating}
        isPrefetching={isPrefetching}
        isDarkMode={isDarkMode}
        language={language}
        shortCodeError={shortCodeError}
      />
      <ImportTokenModal
        isOpen={showImportTokenModal}
        onClose={() => {
          setShowImportTokenModal(false);
          setImportTokenValue("");
        }}
        tokenValue={importTokenValue}
        onTokenChange={(value) => setImportTokenValue(value)}
        onConfirm={() => {
          handleManualTokenImport(importTokenValue);
          setShowImportTokenModal(false);
          setImportTokenValue("");
        }}
        isDarkMode={isDarkMode}
        language={language}
        confirmText={t("confirm")}
      />

      <CopySuccessModal
        isOpen={isCopySuccessModalOpen}
        onClose={() => setIsCopySuccessModalOpen(false)}
        bestModel={activeTemplate?.bestModel}
        templateType={activeTemplate?.type}
        isDarkMode={isDarkMode}
        language={language}
      />

      {/* --- Add Bank Modal --- */}
      <AddBankModal
        isOpen={isAddingBank}
        onClose={() => setIsAddingBank(false)}
        t={t}
        categories={categories}
        newBankLabel={newBankLabel}
        setNewBankLabel={setNewBankLabel}
        newBankKey={newBankKey}
        setNewBankKey={setNewBankKey}
        newBankCategory={newBankCategory}
        setNewBankCategory={setNewBankCategory}
        onConfirm={handleAddBank}
        isDarkMode={isDarkMode}
      />

      {/* --- Category Manager Modal --- */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        setCategories={setCategories}
        banks={banks}
        setBanks={setBanks}
        t={t}
        language={language}
        isDarkMode={isDarkMode}
      />

      {/* --- Smart Split Confirm Modal --- */}
      <ConfirmModal
        isOpen={isSmartSplitConfirmOpen}
        onClose={() => setIsSmartSplitConfirmOpen(false)}
        onConfirm={performSmartSplit}
        title={SMART_SPLIT_CONFIRM_TITLE[language]}
        message={SMART_SPLIT_CONFIRM_MESSAGE[language]}
        confirmText={SMART_SPLIT_BUTTON_TEXT.confirm[language]}
        cancelText={SMART_SPLIT_BUTTON_TEXT.cancel[language]}
        isDarkMode={isDarkMode}
      />

      {/* --- Delete Template Confirm Modal --- */}
      <ConfirmModal
        isOpen={isDeleteTemplateConfirmOpen}
        onClose={() => setIsDeleteTemplateConfirmOpen(false)}
        onConfirm={confirmDeleteTemplate}
        title={language === 'cn' ? '删除模板' : 'Delete Template'}
        message={t('confirm_delete_template')}
        confirmText={language === 'cn' ? '删除' : 'Delete'}
        cancelText={language === 'cn' ? '取消' : 'Cancel'}
        isDarkMode={isDarkMode}
      />

      <AddTemplateTypeModal
        isOpen={isAddTemplateTypeModalOpen}
        onClose={() => setIsAddTemplateTypeModalOpen(false)}
        onSelect={onConfirmAddTemplate}
        isDarkMode={isDarkMode}
        language={language}
      />

      <VideoSubTypeModal
        isOpen={isVideoSubTypeModalOpen}
        onClose={() => setIsVideoSubTypeModalOpen(false)}
        onSelect={onConfirmVideoSubType}
        isDarkMode={isDarkMode}
        language={language}
        t={t}
      />

      {/* --- Action Confirm Modal --- */}
      {actionConfirm && (
        <ConfirmModal
          isOpen={true}
          onClose={closeActionConfirm}
          onConfirm={() => {
            actionConfirm.onConfirm?.();
            closeActionConfirm();
          }}
          title={actionConfirm.title}
          message={actionConfirm.message}
          confirmText={actionConfirm.confirmText}
          cancelText={actionConfirm.cancelText}
          isDarkMode={isDarkMode}
        />
      )}

      {/* --- Notice Modal --- */}
      <NoticeModal
        message={noticeMessage}
        onClose={() => setNoticeMessage(null)}
        language={language}
        isDarkMode={isDarkMode}
      />

      {/* --- Share Import Loading --- */}
      {isImportingShare && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-[#1C1917] border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <div className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {language === 'cn' ? '正在解析模版…' : 'Loading template…'}
              </div>
              <div className={`text-[10px] font-bold opacity-60 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {language === 'cn' ? '请稍等片刻' : 'Please wait'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Export Templates Modal --- */}
      <ExportTemplatesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        userTemplates={userTemplates}
        selectedIds={selectedExportTemplateIds}
        onToggleId={toggleExportTemplateId}
        onToggleAll={toggleExportSelectAll}
        onExport={handleExportAllTemplates}
        language={language}
        isDarkMode={isDarkMode}
      />

            {/* --- Insert Variable Modal --- */}
      <InsertVariableModal
        isOpen={isInsertModalOpen}
        onClose={() => setIsInsertModalOpen(false)}
        categories={categories}
        banks={banks}
        onSelect={(key) => {
          insertVariableToTemplate(key);
          setIsInsertModalOpen(false);
        }}
        t={t}
        language={language}
        isDarkMode={isDarkMode}
      />

      {/* --- Image Preview Modal --- */}
      <ImagePreviewModal
        zoomedImage={zoomedImage}
        templates={templates}
        language={language}
        setLanguage={setLanguage}
        t={t}
        TAG_STYLES={TAG_STYLES}
        displayTag={displayTag}
        setActiveTemplateId={handleSetActiveTemplateId}
        setDiscoveryView={setDiscoveryView}
        setZoomedImage={setZoomedImage}
        setMobileTab={setMobileTab}
        handleRefreshSystemData={handleRefreshSystemData}
        isDarkMode={isDarkMode}
      />

      {/* --- Source Asset Global Modal --- */}
      <SourceAssetModal 
        item={sourceZoomedItem} 
        onClose={() => setSourceZoomedItem(null)} 
        language={language} 
      />

      {/* --- 更新通知组件 --- */}
      <DataUpdateNotice
        isOpen={showDataUpdateNotice}
        onLater={() => {
          setLastAppliedDataVersion(SYSTEM_DATA_VERSION);
          setShowDataUpdateNotice(false);
        }}
        onUpdate={handleAutoUpdate}
        t={t}
      />

      <AppUpdateNotice
        isOpen={showAppUpdateNotice}
        noticeType={updateNoticeType}
        onRefresh={() => {
          // 如果是数据更新，也可以尝试直接触发更新逻辑
          if (updateNoticeType === 'data') {
            handleAutoUpdate();
            setShowAppUpdateNotice(false);
          } else {
            window.location.reload();
          }
        }}
        onClose={() => setShowAppUpdateNotice(false)}
        t={t}
      />

      {/* 移动端底部导航栏 */}
      {isMobileDevice && (
        <MobileBottomNav
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          setDiscoveryView={handleSetDiscoveryView}
          setZoomedImage={setZoomedImage}
          setIsTemplatesDrawerOpen={setIsTemplatesDrawerOpen}
          setIsBanksDrawerOpen={setIsBanksDrawerOpen}
          isDarkMode={isDarkMode}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          templates={templates}
          activeTemplateId={activeTemplateId}
          setActiveTemplateId={handleSetActiveTemplateId}
        />
      )}
      <Analytics />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUploadImage} 
        className="hidden" 
        accept="image/*,video/*" 
      />
    </div>
  );
};

export default App;
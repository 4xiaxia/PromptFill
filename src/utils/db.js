/**
 * IndexedDB 存储中心（基于 Dexie.js）
 * 用于突破 LocalStorage 的 5MB 限制，提供更强大的本地存储能力
 * Dexie.js 提供简洁的 Promise API、自动版本管理和事务支持
 */

import Dexie from 'dexie';

const db = new Dexie('PromptFillDB');

// 定义数据库结构（版本历史向前兼容）
db.version(2).stores({
  handles: '',        // 存储文件系统句柄（key-value，无需索引）
  app_data: '',       // 存储模板、词库等应用数据（key-value，无需索引）
});

/**
 * 兼容旧接口：openDB — 返回 Dexie 实例
 * 保持与 App.jsx 中直接使用 db 事务的代码兼容
 */
export const openDB = async () => db.open().then(() => db);

/**
 * 通用的设置数据方法
 */
export const dbSet = async (key, value) => {
  try {
    await db.table('app_data').put(value, key);
  } catch (error) {
    console.error(`IndexedDB Set Error (${key}):`, error);
    // 降级处理：如果 IDB 失败，暂时写入内存（不写 LS，避免溢出）
  }
};

/**
 * 通用的获取数据方法
 */
export const dbGet = async (key, defaultValue = null) => {
  try {
    const result = await db.table('app_data').get(key);
    return result !== undefined ? result : defaultValue;
  } catch (error) {
    console.error(`IndexedDB Get Error (${key}):`, error);
    return defaultValue;
  }
};

/**
 * 特殊：获取文件夹句柄
 */
export const getDirectoryHandle = async () => {
  try {
    return await db.table('handles').get('directory') ?? null;
  } catch (error) {
    console.error('获取文件夹句柄失败:', error);
    return null;
  }
};

/**
 * 特殊：保存文件夹句柄
 */
export const saveDirectoryHandle = async (handle) => {
  try {
    await db.table('handles').put(handle, 'directory');
  } catch (error) {
    console.error('保存文件夹句柄失败:', error);
  }
};

/**
 * 检查是否已经迁移过数据
 */
export const isMigrated = () => {
  return localStorage.getItem('app_storage_migrated') === 'true';
};

/**
 * 标记迁移完成
 */
export const markMigrated = () => {
  localStorage.setItem('app_storage_migrated', 'true');
  localStorage.setItem('app_storage_mode', 'browser_indexeddb');
};

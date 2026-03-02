/**
 * AI 服务工具函数
 * 用于处理 AI 词条生成的逻辑
 * 对接宝塔后端 AI 代理接口
 */

import { AI_FEATURE_ENABLED } from '../constants/aiConfig';
import { smartFetch } from './platform';

// 云端 AI 处理接口，支持通过环境变量覆盖
const CLOUD_API_URL = import.meta.env.VITE_AI_API_URL || "https://data.tanshilong.com/api/ai/process";

/**
 * 智能生成词条（增强版：支持上下文感知）
 * @param {Object} params - 生成参数
 * @param {string} params.variableLabel - 变量标签
 * @param {string} params.language - 语言 (cn/en)
 * @param {string} params.currentValue - 当前值
 * @param {Array} params.localOptions - 本地词库选项
 * @param {string} params.templateContext - 模板上下文内容
 * @param {number} params.count - 生成数量
 * @param {Object} params.selectedValues - 用户已选择的其他变量值（新增）
 * @returns {Promise<Array>} - AI 生成的词条数组
 */
export const generateAITerms = async (params) => {
  const {
    variableLabel,
    language,
    currentValue,
    localOptions = [],
    templateContext = "",
    count = 5,
    selectedValues = {}  // 新增：用户已选择的其他变量值
  } = params;

  // 检查功能开关
  if (!AI_FEATURE_ENABLED) {
    console.warn('[AI Service] AI feature is disabled');
    return [];
  }

  try {
    // 宝塔后端统一处理接口
    const response = await smartFetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'generate-terms',
        language: language,
        payload: {
          variableLabel,
          context: templateContext,
          localOptions: localOptions.slice(0, 15), // 传递部分本地选项供参考
          currentValue,
          count,
          selectedValues  // 新增：传递用户已选择的变量值
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI Server Error: ${response.status}`);
    }

    const result = await response.json();
    
    // 后端返回的是 { success: true, terms: [...] }
    if (result.success && Array.isArray(result.terms)) {
      return result.terms;
    }
    
    return [];
  } catch (error) {
    console.error('[AI Service] Failed to fetch smart terms:', error);
    throw error;
  }
};

/**
 * 智能一键润色与拆分
 * @param {Object} params - 参数
 * @param {string} params.rawPrompt - 原始提示词
 * @param {string} params.existingBankContext - 现有词库上下文信息
 * @param {Array} params.availableTags - 可选标签列表
 * @param {string} params.language - 语言
 * @returns {Promise<Object>} - AI 处理结果
 */
export const polishAndSplitPrompt = async (params) => {
  const { rawPrompt, existingBankContext = '', availableTags = [], language = 'cn' } = params;

  // 检查功能开关
  if (!AI_FEATURE_ENABLED) {
    console.warn('[AI Service] AI feature is disabled');
    throw new Error('AI 功能已禁用');
  }

  try {
    const response = await smartFetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'polish-and-split',
        language: language,
        payload: {
          rawPrompt,
          existingBankContext,
          availableTags
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI Server Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error('AI 返回数据格式错误');
  } catch (error) {
    console.error('[AI Service] Polish and Split failed:', error);
    throw error;
  }
};

/**
 * 以下函数由于采用了后端代理，且 Key 存储在服务器环境变量中，
 * 前端不再直接管理 API Key。保留空实现或按需移除。
 */
export const validateApiKey = () => true;
export const getStoredApiKey = () => "MANAGED_BY_BACKEND";
export const storeApiKey = () => true;
export const clearApiKey = () => true;

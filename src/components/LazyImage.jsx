/**
 * LazyImage - 图片懒加载组件
 * 特性：
 * 1. 原生 IntersectionObserver 懒加载
 * 2. CDN 代理和智能降级
 * 3. 加载状态指示
 * 4. 错误处理和重试
 * 5. WebP 格式支持
 */

import React, { useState, useEffect, useRef } from 'react';
import { proxyImage, verifyImageUrl } from '../utils/cdnProxy.js';
import CONFIG from '../constants/config.js';

/**
 * LazyImage 组件
 *
 * @component
 * @example
 * // 基础用法
 * <LazyImage src="https://example.com/image.jpg" alt="示例图片" />
 *
 * @example
 * // 带优化选项
 * <LazyImage
 *   src="https://example.com/image.jpg"
 *   alt="示例"
 *   width={200}
 *   height={150}
 *   quality={80}
 *   placeholder="blur"
 * />
 *
 * @param {object} props - 组件属性
 * @param {string} props.src - 图片 URL（必需）
 * @param {string} props.alt - 图片描述文本（必需）
 * @param {number} [props.width] - 图片宽度（像素）
 * @param {number} [props.height] - 图片高度（像素）
 * @param {number} [props.quality=85] - 压缩质量 1-100
 * @param {string} [props.format='webp'] - 输出格式 'webp'|'jpg'|'png'
 * @param {string} [props.placeholder='color'] - 占位符类型 'color'|'blur'|'none'
 * @param {string} [props.placeholderColor='#f0f0f0'] - 占位符颜色
 * @param {number} [props.placeholderBlur=20] - 模糊值
 * @param {boolean} [props.useProxy=true] - 是否使用 CDN 代理
 * @param {boolean} [props.useLazyLoad=true] - 是否启用懒加载
 * @param {number} [props.loadingPriority='low'] - 加载优先级 'low'|'high'
 * @param {string} [props.className] - CSS 类名
 * @param {string} [props.style] - 内联样式
 * @param {function} [props.onLoad] - 图片加载完成回调
 * @param {function} [props.onError] - 图片加载失败回调
 */
const LazyImage = React.forwardRef((props, ref) => {
  const {
    src,
    alt = '',
    width,
    height,
    quality = 85,
    format = 'webp',
    placeholder = 'color',
    placeholderColor = '#f0f0f0',
    placeholderBlur = 20,
    useProxy = CONFIG.FEATURES.CDN_PROXY_ENABLED,
    useLazyLoad = true,
    loadingPriority = 'low',
    className = '',
    style = {},
    onLoad,
    onError,
    ...restProps
  } = props;

  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [actualFormat, setActualFormat] = useState(format);

  const MAX_RETRIES = 2;

  // ==========================================
  // 图片 URL 处理
  // ==========================================

  /**
   * 处理图片 URL（代理、验证等）
   */
  useEffect(() => {
    if (!src) {
      setImageSrc(null);
      return;
    }

    let isMounted = true;

    const processImageUrl = async () => {
      try {
        let processedUrl = src;

        // 1. 使用 CDN 代理
        if (useProxy && CONFIG.FEATURES.CDN_PROXY_ENABLED) {
          processedUrl = await proxyImage(src, {
            width,
            height,
            quality,
            format: actualFormat,
          });
        }

        // 2. 验证图片可访问性
        const isAccessible = await verifyImageUrl(processedUrl, 3000);
        if (!isAccessible && retryCount < MAX_RETRIES) {
          console.warn(`[LazyImage] 图片不可访问，尝试重试: ${processedUrl}`);
          setRetryCount(prev => prev + 1);
          return;
        }

        if (isMounted) {
          setImageSrc(processedUrl);
          setIsError(!isAccessible);
        }
      } catch (error) {
        console.error('[LazyImage] URL 处理失败:', error);
        if (isMounted) {
          setIsError(true);
        }
      }
    };

    processImageUrl();

    return () => {
      isMounted = false;
    };
  }, [src, useProxy, quality, width, height, actualFormat, retryCount]);

  // ==========================================
  // 懒加载实现
  // ==========================================

  useEffect(() => {
    if (!useLazyLoad || !imageSrc) return;

    const container = containerRef.current;
    if (!container) return;

    // 使用 IntersectionObserver 实现懒加载
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = imgRef.current;
            if (img && img.dataset.src) {
              img.src = img.dataset.src;
              delete img.dataset.src;
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // 提前 50px 开始加载
        threshold: 0.01,
      }
    );

    observerRef.current.observe(container);

    return () => {
      observerRef.current?.unobserve(container);
    };
  }, [useLazyLoad, imageSrc]);

  // ==========================================
  // 事件处理
  // ==========================================

  const handleLoad = event => {
    setIsLoading(false);
    setIsError(false);

    if (onLoad) {
      onLoad(event);
    }
  };

  const handleError = event => {
    setIsLoading(false);
    setIsError(true);

    // 尝试降级到其他格式
    if (actualFormat !== 'jpg' && !event.target.src.includes('jpg')) {
      console.warn('[LazyImage] 图片加载失败，尝试 JPG 格式');
      setActualFormat('jpg');
      return;
    }

    if (onError) {
      onError(event);
    }
  };

  // ==========================================
  // 样式计算
  // ==========================================

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  // 占位符样式
  let placeholderStyle = {};
  if (placeholder === 'color') {
    placeholderStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: placeholderColor,
      zIndex: 1,
    };
  } else if (placeholder === 'blur' && imageSrc && !isLoading) {
    // 模糊占位符在图片加载时显示
    placeholderStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `url(${imageSrc})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: `blur(${placeholderBlur}px)`,
      zIndex: 1,
    };
  }

  // 图片样式
  const imgStyle = {
    position: 'relative',
    zIndex: isLoading ? 0 : 2,
    opacity: isLoading ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
  };

  // ==========================================
  // 渲染
  // ==========================================

  // 错误状态
  if (isError && !imageSrc) {
    return (
      <div
        ref={containerRef}
        className={`lazy-image lazy-image-error ${className}`}
        style={containerStyle}
        {...restProps}
      >
        <div style={placeholderStyle} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            color: '#999',
            fontSize: '14px',
            zIndex: 3,
          }}
        >
          {width || height ? '加载失败' : '✕'}
        </div>
      </div>
    );
  }

  // 正常渲染
  return (
    <div
      ref={containerRef}
      className={`lazy-image ${isLoading ? 'lazy-image-loading' : ''} ${className}`}
      style={containerStyle}
      {...restProps}
    >
      {/* 占位符 */}
      {placeholder !== 'none' && <div style={placeholderStyle} />}

      {/* 加载指示 */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: placeholderColor,
            zIndex: 2,
          }}
        >
          <div style={{ width: 24, height: 24, border: '2px solid #ddd', borderTop: '2px solid #666', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* 实际图片 */}
      <img
        ref={imgRef}
        alt={alt}
        width={width}
        height={height}
        loading={useLazyLoad ? 'lazy' : 'eager'}
        {...(useLazyLoad ? { 'data-src': imageSrc } : { src: imageSrc })}
        onLoad={handleLoad}
        onError={handleError}
        style={imgStyle}
        className="lazy-image-img"
      />

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

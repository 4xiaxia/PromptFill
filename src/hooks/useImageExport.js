/**
 * 图片导出 Hook
 * 封装 handleExportImage 逻辑，包括 Base64 图片预处理、html2canvas 渲染和多平台下载
 */
import { useState, useRef, useCallback } from 'react';
import { waitForImageLoad, getLocalized, compressTemplate } from '../utils';
import { PUBLIC_SHARE_URL } from '../data/templates';

/**
 * 使用 qrcode.react 在本地生成二维码 Data URL，避免外部 API 依赖，确保国内可用
 * @param {string} url - 二维码内容
 * @param {number} size - 二维码尺寸
 * @returns {Promise<string|null>} - 二维码 Data URL 或 null
 */
const generateQRDataURL = async (url, size = 200) => {
  try {
    const [{ createRoot }, { flushSync }, { QRCodeCanvas }] = await Promise.all([
      import('react-dom/client'),
      import('react-dom'),
      import('qrcode.react'),
    ]);
    const React = (await import('react')).default;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-99999px;top:0;';
    document.body.appendChild(container);

    const root = createRoot(container);
    flushSync(() => {
      root.render(React.createElement(QRCodeCanvas, { value: url, size, marginSize: 2 }));
    });

    const canvas = container.querySelector('canvas');
    const dataUrl = canvas ? canvas.toDataURL('image/png') : null;
    root.unmount();
    try { document.body.removeChild(container); } catch (e) { console.warn('[generateQRDataURL] 清理临时容器失败:', e); }
    return dataUrl;
  } catch {
    return null;
  }
};

export const useImageExport = ({
  activeTemplate,
  activeTemplateId,
  banks,
  categories,
  language,
  INITIAL_TEMPLATES_CONFIG,
  getShortCodeFromServer,
  setNoticeMessage,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const imageBase64Cache = useRef({});

  // 静默预缓存当前模板图片，提升导出体验
  const preCacheImage = useCallback(async (url) => {
    if (!url || !url.startsWith('http')) return;
    if (imageBase64Cache.current[url]) return;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        imageBase64Cache.current[url] = base64;
      }
    } catch {
      // 静默失败，导出时会尝试代理
    }
  }, []);

  const handleExportImage = useCallback(async () => {
    const element = document.getElementById('preview-card');
    if (!element) return;

    setIsExporting(true);

    // 导出长图时，水印链接优先使用正式域名，避免显示 localhost
    let displayUrl = PUBLIC_SHARE_URL || (window.location.origin + window.location.pathname);
    if (!displayUrl || displayUrl.includes('localhost') || displayUrl.includes('127.0.0.1')) {
      displayUrl = "https://aipromptfill.com";
    }

    let qrContentUrl = "https://aipromptfill.com";
    let qrBase64 = "/QRCode.png";

    try {
      const compressed = compressTemplate(activeTemplate, banks, categories);
      const shortCode = await getShortCodeFromServer(compressed);
      const base = PUBLIC_SHARE_URL || displayUrl;
      const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;

      if (shortCode) {
        const shortUrl = `${normalizedBase}/#/share?share=${shortCode}`;
        displayUrl = shortUrl;
        qrContentUrl = shortUrl;
      } else if (compressed) {
        displayUrl = `${normalizedBase}/#/share?share=${compressed}`;
        qrContentUrl = "https://aipromptfill.com";
      }

      // 本地生成二维码，避免外部 API 依赖，确保国内可用
      const localQR = await generateQRDataURL(qrContentUrl, 200);
      if (localQR) {
        qrBase64 = localQR;
      }
    } catch (e) {
      console.warn("获取短链接或二维码失败:", e);
    }

    const displayUrlText = displayUrl.length > 150
      ? displayUrl.substring(0, 140) + '...'
      : displayUrl;

    const templateDefault = INITIAL_TEMPLATES_CONFIG.find(t => t.id === activeTemplateId);
    const originalImageSrc = activeTemplate.imageUrl || templateDefault?.imageUrl || "";
    let tempBase64Src = imageBase64Cache.current[originalImageSrc] || null;
    const imgElement = element.querySelector('img');

    if (imgElement && originalImageSrc) {
      if (!imgElement.src || imgElement.src.trim() === "" || !imgElement.src.includes("data:image")) {
        imgElement.src = originalImageSrc;
      }
    }

    if (!tempBase64Src && imgElement && originalImageSrc && originalImageSrc.startsWith('http')) {
      const fetchWithRetry = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Fetch failed');
          const blob = await response.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      try {
        tempBase64Src = await fetchWithRetry(originalImageSrc);
        if (!tempBase64Src) {
          console.log("直接获取图片失败，尝试使用代理...");
          const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalImageSrc)}`;
          tempBase64Src = await fetchWithRetry(proxyUrl);
        }
        if (tempBase64Src) {
          imageBase64Cache.current[originalImageSrc] = tempBase64Src;
        }
      } catch (e) {
        console.warn("图片 Base64 转换失败", e);
      }
    }

    if (tempBase64Src && imgElement) {
      imgElement.src = tempBase64Src;
      await waitForImageLoad(imgElement);
    } else if (imgElement) {
      await waitForImageLoad(imgElement);
    }

    try {
      // 动态导入 html2canvas，避免影响初始加载速度
      const { default: html2canvas } = await import('html2canvas');

      const exportContainer = document.createElement('div');
      exportContainer.id = 'export-container-temp';
      exportContainer.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;min-height:800px;padding:20px;background:#fafafa;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(exportContainer);

      const bgLayer = document.createElement('div');
      bgLayer.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,#F08F62 0%,#EB7A54 100%);z-index:0;';
      exportContainer.appendChild(bgLayer);

      const clonedCard = element.cloneNode(true);
      clonedCard.style.cssText = 'position:relative;z-index:10;background:rgba(255,255,255,0.98);border-radius:24px;box-shadow:0 8px 32px -4px rgba(0,0,0,0.12),0 4px 16px -2px rgba(0,0,0,0.08),0 0 0 1px rgba(0,0,0,0.05);border:1px solid rgba(255,255,255,0.8);padding:40px 45px;margin:0 auto;width:860px;box-sizing:border-box;font-family:"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased;';
      exportContainer.appendChild(clonedCard);

      const canvas = await html2canvas(exportContainer, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('export-container-temp');
          if (!clonedElement) return;
          const card = clonedElement.querySelector('#preview-card');
          if (!card) return;

          const originalImg = card.querySelector('img');
          const imgSrc = tempBase64Src || (originalImg ? originalImg.src : '');
          const titleElement = card.querySelector('h2');
          const titleText = titleElement ? titleElement.textContent.trim() : getLocalized(activeTemplate.name, language);
          const contentElement = card.querySelector('#final-prompt-content');
          const contentHTML = contentElement ? contentElement.innerHTML : '';

          const metaContainer = card.querySelector('.flex.flex-wrap.gap-2');
          const versionElement = metaContainer ? metaContainer.querySelector('.bg-orange-50') : null;
          const versionText = versionElement ? versionElement.textContent.trim() : '';

          card.innerHTML = '';

          if (imgSrc) {
            const imgContainer = clonedDoc.createElement('div');
            imgContainer.style.cssText = 'width:100%;margin-bottom:30px;display:flex;justify-content:center;align-items:center;';
            const img = clonedDoc.createElement('img');
            img.src = imgSrc;
            img.style.cssText = 'width:100%;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);box-sizing:border-box;';
            imgContainer.appendChild(img);
            card.appendChild(imgContainer);
          }

          const titleContainer = clonedDoc.createElement('div');
          titleContainer.style.marginBottom = '25px';
          const title = clonedDoc.createElement('h2');
          title.textContent = titleText;
          title.style.cssText = 'font-size:32px;font-weight:700;color:#1f2937;margin:0;line-height:1.2;';
          titleContainer.appendChild(title);
          card.appendChild(titleContainer);

          if (contentHTML) {
            const contentContainer = clonedDoc.createElement('div');
            contentContainer.innerHTML = contentHTML;
            contentContainer.style.cssText = 'font-size:18px;line-height:1.8;color:#374151;margin-bottom:40px;';

            contentContainer.querySelectorAll('h3').forEach(h => {
              h.style.color = '#111827';
              h.style.borderBottom = '1px solid #f3f4f6';
            });
            contentContainer.querySelectorAll('div, p, span').forEach(d => {
              if (!d.hasAttribute('data-export-pill')) d.style.color = '#374151';
            });
            contentContainer.querySelectorAll('strong').forEach(s => { s.style.color = '#111827'; });
            contentContainer.querySelectorAll('.mt-2\\.5, .font-mono').forEach(st => { st.style.color = '#9ca3af'; });
            contentContainer.querySelectorAll('[data-export-pill="true"]').forEach(v => {
              if (v.parentElement?.classList.contains('inline-block')) {
                v.parentElement.style.display = 'inline';
                v.parentElement.style.margin = '0';
              }
              v.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:4px 12px;margin:2px 4px;border-radius:6px;font-size:17px;font-weight:600;line-height:1.5;vertical-align:middle;box-shadow:0 1px 3px rgba(0,0,0,0.1);color:#ffffff;border:none;';
              if (v.textContent.includes('[') && v.textContent.includes('?]')) {
                v.style.color = '#9ca3af';
                v.style.background = '#f8fafc';
                v.style.border = '1px solid #e2e8f0';
              }
            });

            card.appendChild(contentContainer);
          }

          const footer = clonedDoc.createElement('div');
          footer.style.cssText = 'margin-top:40px;padding-top:25px;padding-bottom:15px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;';
          footer.innerHTML = `
            <div style="flex:1;padding-right:20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <div style="font-size:15px;font-weight:600;color:#1f2937;">Generated by <span style="color:#6366f1;font-weight:700;">Prompt Fill</span></div>
                ${versionText ? `<span style="font-size:11px;padding:3px 10px;background:#fff7ed;color:#f97316;border-radius:5px;font-weight:600;border:1px solid #fed7aa;">${versionText}</span>` : ''}
              </div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:6px;font-weight:500;">提示词填空器 - 让分享更简单</div>
              <div style="font-size:11px;color:#3b82f6;font-weight:500;background:#eff6ff;padding:4px 10px;border-radius:6px;display:block;letter-spacing:0.3px;word-break:break-all;max-width:100%;min-height:14px;line-height:1.4;">${displayUrlText}</div>
            </div>
            <div style="display:flex;align-items:center;">
              <div style="text-align:center;">
                <img src="${qrBase64}" style="width:85px;height:85px;border:3px solid #e2e8f0;border-radius:8px;display:block;background:white;" alt="QR Code"/>
                <div style="font-size:9px;color:#94a3b8;margin-top:4px;font-weight:500;">扫码体验</div>
              </div>
            </div>
          `;
          card.appendChild(footer);
        }
      });

      const image = canvas.toDataURL('image/jpeg', 0.92);
      const activeTemplateName = getLocalized(activeTemplate.name, language);
      const filename = `${activeTemplateName.replace(/\s+/g, '_')}_prompt.jpg`;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        try {
          const base64Response = await fetch(image);
          const blob = await base64Response.blob();
          const file = new File([blob], filename, { type: 'image/jpeg' });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: activeTemplateName, text: '导出的提示词模板' });
            setNoticeMessage('✅ 图片已分享，请选择"存储图像"保存到相册');
          } else if (isIOS) {
            const newWindow = window.open();
            if (newWindow) {
              newWindow.document.write(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${activeTemplateName}</title><style>body{margin:0;padding:20px;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;}img{max-width:100%;height:auto;}.tip{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.95);padding:12px 20px;border-radius:8px;color:#333;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:1000;}</style></head><body><div class="tip">长按图片保存到相册 📱</div><img src="${image}" alt="${activeTemplateName}"/></body></html>`);
              setNoticeMessage('✅ 请在新页面长按图片保存');
            } else {
              const link = document.createElement('a');
              link.href = image; link.download = filename; link.target = '_blank';
              document.body.appendChild(link); link.click(); document.body.removeChild(link);
              setNoticeMessage('✅ 图片已导出，请在新页面保存');
            }
          } else {
            const link = document.createElement('a');
            link.href = image; link.download = filename;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setNoticeMessage('✅ 图片已保存到下载文件夹');
          }
        } catch {
          if (isIOS) {
            const newWindow = window.open();
            if (newWindow) {
              newWindow.document.write(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${activeTemplateName}</title></head><body style="margin:0;padding:20px;background:#000;text-align:center;"><p style="color:#fff;margin-bottom:20px;">长按图片保存到相册 📱</p><img src="${image}" style="max-width:100%;height:auto;"/></body></html>`);
            }
            setNoticeMessage('⚠️ 请在新页面长按图片保存');
          } else {
            const link = document.createElement('a');
            link.href = image; link.download = filename;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setNoticeMessage('✅ 图片已保存');
          }
        }
      } else {
        const link = document.createElement('a');
        link.href = image; link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setNoticeMessage('✅ 图片导出成功！');
      }
    } catch (err) {
      console.error("Export failed:", err);
      setNoticeMessage('❌ 导出失败，请重试');
    } finally {
      const tempContainer = document.getElementById('export-container-temp');
      if (tempContainer) document.body.removeChild(tempContainer);
      if (imgElement && originalImageSrc) imgElement.src = originalImageSrc;
      setIsExporting(false);
    }
  }, [activeTemplate, activeTemplateId, banks, categories, language, INITIAL_TEMPLATES_CONFIG, getShortCodeFromServer, setNoticeMessage]);

  return { isExporting, imageBase64Cache, preCacheImage, handleExportImage };
};

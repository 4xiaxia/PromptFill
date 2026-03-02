import React from 'react';
import { X, Check } from 'lucide-react';
import { PremiumButton } from '../PremiumButton';

/**
 * 图片/视频 URL 输入弹窗
 */
export const ImageUrlModal = ({
  isOpen,
  onClose,
  imageUrlInput,
  setImageUrlInput,
  onConfirm,
  templateType,
  t,
  language,
  isDarkMode,
}) => {
  if (!isOpen) return null;
  const isVideo = templateType === 'video';
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border animate-scale-up ${isDarkMode ? 'bg-[#242120] border-white/5' : 'bg-white border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 relative">
          <button
            onClick={onClose}
            className={`absolute top-6 right-6 p-2 rounded-full transition-all ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <X size={20} />
          </button>

          <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {isVideo
              ? (language === 'cn' ? '视频链接' : 'Video URL')
              : (language === 'cn' ? '图片链接' : 'Image URL')}
          </h3>
          <p className={`text-xs font-bold mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {isVideo
              ? (language === 'cn' ? '请输入视频的在线地址' : 'Please enter the online video URL')
              : (language === 'cn' ? '请输入图片的在线地址' : 'Please enter the online image URL')}
          </p>

          <div className="space-y-6">
            <div className={`premium-search-container group ${isDarkMode ? 'dark' : 'light'} !rounded-2xl`}>
              <input
                autoFocus
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder={isVideo
                  ? (language === 'cn' ? '输入视频 URL 地址...' : 'Enter video URL...')
                  : t('image_url_placeholder')}
                className={`w-full px-5 py-4 text-xs font-mono outline-none bg-transparent ${isDarkMode ? 'text-gray-300 placeholder:text-gray-700' : 'text-gray-700 placeholder:text-gray-400'}`}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
              />
            </div>

            <PremiumButton
              onClick={onConfirm}
              disabled={!imageUrlInput.trim()}
              isDarkMode={isDarkMode}
              className="w-full size-lg"
              icon={Check}
              justify="start"
            >
              <div className="flex flex-col items-start ml-2 text-left">
                <span className="text-sm font-black">{t('use_url')}</span>
                <span className={`text-[10px] font-bold opacity-50`}>
                  {language === 'cn' ? '确认并应用此链接' : 'Confirm and apply this link'}
                </span>
              </div>
            </PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
};

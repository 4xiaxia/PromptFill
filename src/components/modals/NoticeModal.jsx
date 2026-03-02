import React from 'react';
import { X } from 'lucide-react';
import { PremiumButton } from '../PremiumButton';

/**
 * 通用通知弹窗
 */
export const NoticeModal = ({ message, onClose, language, isDarkMode }) => {
  if (!message) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border animate-in slide-in-from-bottom-4 duration-300 ${isDarkMode ? 'bg-[#1C1917] border-white/10' : 'bg-white border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 flex justify-between items-center ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
          <h3 className={`font-black text-lg tracking-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {language === 'cn' ? '提示' : 'Notice'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          <p className={`text-base font-medium leading-relaxed whitespace-pre-line ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {message}
          </p>
        </div>
        <div className={`p-6 flex justify-end ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
          <PremiumButton
            onClick={onClose}
            isDarkMode={isDarkMode}
            className="!h-11 !rounded-2xl min-w-[100px]"
          >
            <span className="text-sm font-bold px-4">{language === 'cn' ? '知道了' : 'OK'}</span>
          </PremiumButton>
        </div>
      </div>
    </div>
  );
};

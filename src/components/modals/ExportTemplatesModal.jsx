import React from 'react';
import { X } from 'lucide-react';
import { PremiumButton } from '../PremiumButton';
import { getLocalized } from '../../utils';

/**
 * 导出模版选择弹窗
 */
export const ExportTemplatesModal = ({
  isOpen,
  onClose,
  userTemplates,
  selectedIds,
  onToggleId,
  onToggleAll,
  onExport,
  language,
  isDarkMode,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border animate-in slide-in-from-bottom-4 duration-300 ${isDarkMode ? 'bg-[#1C1917] border-white/10' : 'bg-white border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 flex justify-between items-center ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
          <h3 className={`font-black text-lg tracking-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {language === 'cn' ? '导出模版' : 'Export Templates'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'cn' ? '仅导出个人模版（系统模版不可选）' : 'Only user templates can be exported'}
            </span>
            <button
              onClick={onToggleAll}
              className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}
            >
              {selectedIds.length === userTemplates.length
                ? (language === 'cn' ? '取消全选' : 'Clear')
                : (language === 'cn' ? '全选' : 'Select All')}
            </button>
          </div>

          <div className={`max-h-[50vh] overflow-y-auto rounded-2xl border ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
            {userTemplates.map((tpl) => {
              const checked = selectedIds.includes(tpl.id);
              return (
                <label
                  key={tpl.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-white'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleId(tpl.id)}
                    className="accent-orange-500"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {getLocalized(tpl.name, language)}
                    </span>
                    <span className={`text-[10px] font-bold opacity-60 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {tpl.author || 'PromptFill User'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className={`p-6 flex gap-3 justify-end ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
          <PremiumButton
            onClick={onClose}
            isDarkMode={isDarkMode}
            className="!h-11 !rounded-2xl min-w-[100px]"
          >
            <span className="text-sm font-bold px-4">{language === 'cn' ? '取消' : 'Cancel'}</span>
          </PremiumButton>
          <PremiumButton
            onClick={async () => {
              await onExport(selectedIds);
              onClose();
            }}
            active={true}
            isDarkMode={isDarkMode}
            className="!h-11 !rounded-2xl min-w-[120px]"
          >
            <span className="text-sm font-black tracking-widest px-4">{language === 'cn' ? '导出' : 'Export'}</span>
          </PremiumButton>
        </div>
      </div>
    </div>
  );
};

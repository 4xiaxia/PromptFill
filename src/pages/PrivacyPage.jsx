import { useStickyState } from '../hooks';
import { getSystemLanguage } from '../utils';
import { ArrowLeft, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
  const [language, setLanguage] = useStickyState(getSystemLanguage(), "app_language_v1");
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches; // 简单判断，保持一致感
  const navigate = useNavigate();

  const t = (cn, en) => (language === 'cn' ? cn : en);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#1C1917] text-gray-200' : 'bg-white text-gray-800'}`}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header with Back button and Language Switcher */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <ArrowLeft size={18} />
            {t('返回', 'Back')}
          </button>

          <button
            onClick={() => setLanguage(language === 'cn' ? 'en' : 'cn')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isDarkMode ? 'bg-white/5 text-orange-400' : 'bg-gray-100 text-blue-600'}`}
          >
            <Globe size={18} />
            {language === 'cn' ? 'English' : '简体中文'}
          </button>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-3xl font-black tracking-tight">
            {t('隐私政策', 'Privacy Policy')}
          </h1>
        </div>
        <p className={`text-sm mb-8 font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('最后更新：2026-02-01', 'Last updated: 2026-02-01')}
        </p>

        <p className="leading-7 mb-6 text-lg">
          {t(
            '本应用（“提示词填空器 / PromptFill”）非常重视用户隐私。我们承诺：不收集、不上传用户的个人信息，所有数据主要存储在本地设备或用户自己的 iCloud 中。',
            'PromptFill respects your privacy. We do not collect or upload personal information. Data is stored locally on your device or in your own iCloud (if enabled).'
          )}
        </p>



        <div className={`mt-20 pt-8 border-t text-center text-xs font-bold ${isDarkMode ? 'border-white/5 text-gray-600' : 'border-gray-100 text-gray-400'}`}>
          © 2026 PromptFill. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Language as LanguageIcon, Check } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';

interface TopBarProps {
  onMenuToggle: () => void;
  activeTab: string;
}

const languageOptions: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
];

export function TopBar({ onMenuToggle, activeTab }: TopBarProps) {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { title, subtitle } = t.topbar[activeTab as keyof typeof t.topbar] || t.topbar.overview;

  // Read stored user to display role
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const role: string = storedUser?.role || 'unknown';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languageOptions.find(l => l.code === language)!;

  return (
    <header className="relative z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu className="text-gray-700" />
          </motion.button>

          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Role Badge */}
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border bg-blue-100 text-blue-700 border-blue-200">
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>

          {/* Language Toggle */}
          <div className="relative" ref={menuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLangMenuOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
            >
              <LanguageIcon fontSize="small" className="text-blue-600" />
              <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
              <span className="sm:hidden">{currentLang.flag}</span>
            </motion.button>

            <AnimatePresence>
              {langMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[100] ${isRTL ? 'left-0' : 'right-0'}`}
                >
                  {languageOptions.map(option => (
                    <button
                      key={option.code}
                      onClick={() => { setLanguage(option.code); setLangMenuOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                        language === option.code
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      } ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{option.flag}</span>
                        <span>{option.label}</span>
                      </span>
                      {language === option.code && <Check fontSize="small" className="text-blue-600" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
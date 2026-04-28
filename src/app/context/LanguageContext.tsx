import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: translations.en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('dashboard_language') as Language) || 'en';
  });

  const isRTL = language === 'ar';
  const t = translations[language];

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('dashboard_language', lang);
  };

  // Apply RTL/LTR and font to the document root
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    html.setAttribute('lang', language);
    if (isRTL) {
      html.style.fontFamily = "'Cairo', 'Segoe UI', sans-serif";
    } else {
      html.style.fontFamily = "'Inter', 'Segoe UI', sans-serif";
    }
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

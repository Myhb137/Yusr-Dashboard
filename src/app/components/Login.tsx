import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Email, Lock, ArrowForward, Language as LanguageIcon, Check } from '@mui/icons-material';
import logo from '../../assets/buraq-blue.png';
import { authService } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';

interface LoginProps {
  onLoginSuccess: () => void;
}

const languageOptions: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
];

export function Login({ onLoginSuccess }: LoginProps) {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.login({ email, password });
      const profile = await authService.getCurrentUser();
      const role = String(profile?.user?.role || profile?.role || '').toLowerCase().trim();
      const fullUser = profile?.user || profile || {};
      localStorage.setItem('user', JSON.stringify(fullUser));

      if (role === 'admin' || role === 'superadmin') {
        onLoginSuccess();
      } else {
        await authService.logout();
        setError(t.login.accessDenied);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t.login.invalidCredentials);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = `w-full py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-900 transition-all placeholder:text-gray-400 font-medium ${isRTL ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`;
  const iconClass = `absolute top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors ${isRTL ? 'right-4' : 'left-4'}`;

  return (
    <div className={`flex min-h-screen bg-white ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      
      {/* Left/Main Column - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">

        {/* Language Switcher — top corner */}
        <div className={`absolute top-8 ${isRTL ? 'left-8 sm:left-16' : 'right-8 sm:right-16'} z-50`}>
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLangMenuOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
            >
              <LanguageIcon fontSize="small" className="text-blue-600" />
              <span>{languageOptions.find(l => l.code === language)?.flag}</span>
              <span className="hidden sm:inline">{languageOptions.find(l => l.code === language)?.label}</span>
            </motion.button>

            <AnimatePresence>
              {langMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-100 ${isRTL ? 'left-0' : 'right-0'}`}
                >
                  {languageOptions.map(option => (
                    <button
                      key={option.code}
                      onClick={() => { setLanguage(option.code); setLangMenuOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                        language === option.code ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{option.flag}</span>
                        <span>{option.label}</span>
                      </span>
                      {language === option.code && <Check fontSize="small" className="text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          key={language}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="mb-10">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Buraq" className="h-40 w-auto object-contain" />
            </div>
            <h1 className={`text-4xl font-extrabold text-gray-900 tracking-tight mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.login.welcome}
            </h1>
            <p className={`text-gray-500 text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.login.subtitle}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium relative overflow-hidden"
            >
              <div className={`w-1 h-full bg-red-500 rounded-full absolute top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'}`}></div>
              <span className={`block ${isRTL ? 'pr-3 text-right' : 'pl-3'}`}>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
            <div>
              <label className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.login.email}
              </label>
              <div className="relative group">
                <Email className={iconClass} fontSize="small" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder={t.login.emailPlaceholder}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.login.password}
              </label>
              <div className="relative group">
                <Lock className={iconClass} fontSize="small" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder={t.login.passwordPlaceholder}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input type="checkbox" className="peer w-5 h-5 appearance-none rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer" />
                  <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                  {t.login.rememberMe}
                </span>
              </label>
              <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                {t.login.forgotPassword}
              </a>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isLoading}
              className={`w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{t.login.signIn}</span>
                  <ArrowForward fontSize="small" className={`${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'} transition-transform`} />
                </>
              )}
            </motion.button>
          </form>

          <p className={`mt-8 text-center text-sm text-gray-500`}>
            {t.login.trouble}{' '}
            <a href="#" className="text-blue-600 font-medium hover:underline">
              {t.login.contactAdmin}
            </a>
          </p>
        </motion.div>
      </div>

      {/* Right Column - Hero Image (hides on mobile) */}
      <div className="hidden lg:block w-1/2 relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2000&auto=format&fit=crop"
          alt="Travel Destination"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className={`absolute bottom-0 p-16 z-20 w-full ${isRTL ? 'right-0 text-right' : 'left-0 text-left'}`}>
          <motion.div
            key={`hero-${language}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white text-xs font-bold uppercase tracking-wider mb-4">
              Buraq Travel Platform
            </div>
            <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
              {language === 'ar' ? (
                <>أدِر <span className="text-blue-400">وكالاتك</span> وعروضك العالمية.</>
              ) : language === 'fr' ? (
                <>Gérez vos <span className="text-blue-400">agences</span> et offres mondiales.</>
              ) : (
                <>Manage your <span className="text-blue-400">agencies</span> <br/>and global offers.</>
              )}
            </h2>
            <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
              {language === 'ar'
                ? 'المركز المركزي لعمليات سياحة بُراق. أشرف على الحجوزات، وراقب أداء الوكالات، وحسّن سير العمل.'
                : language === 'fr'
                  ? "Le centre de commande centralisé pour les opérations de voyage Buraq. Supervisez les réservations, surveillez les performances des agences et optimisez les flux de travail."
                  : 'The centralized command center for Buraq travel operations. Oversee bookings, monitor agency performance, and streamline workflows.'}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

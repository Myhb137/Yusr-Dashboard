import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Email, Lock, ArrowForward, Language as LanguageIcon, Check, MarkEmailRead } from '@mui/icons-material';
import logo from '../../assets/buraq-blue.png';
import { authService } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';
import { persistLoginEmail, resolveCurrentUserId } from '../utils/tenantScope';
import { Language } from '../i18n/translations';

interface LoginProps {
  onLoginSuccess: () => void;
}

const languageOptions: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
];

type Step = 'credentials' | 'verify_otp';

export function Login({ onLoginSuccess }: LoginProps) {
  const { t, language, setLanguage, isRTL } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [step, setStep] = useState<Step>('credentials');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isSlowServer, setIsSlowServer] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLoadingWithSlowHint = () => {
    setIsLoading(true);
    setIsSlowServer(false);
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => setIsSlowServer(true), 5000);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setIsSlowServer(false);
    if (slowTimerRef.current) { clearTimeout(slowTimerRef.current); slowTimerRef.current = null; }
  };

  useEffect(() => () => { if (slowTimerRef.current) clearTimeout(slowTimerRef.current); }, []);

  // Rate-limit cooldown (429 handling)
  const COOLDOWN_SECONDS = 60;
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRateLimitCountdown(COOLDOWN_SECONDS);
    countdownRef.current = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const isRateLimited = rateLimitCountdown > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isRateLimited) return; // guard against double-submit
    setError(null);
    startLoadingWithSlowHint();

    try {
      const response = await authService.login({ email, password });

      if ((response.requiresOtp || response.requiresTwoFactor) && response.twoFactorToken) {
        setTwoFactorToken(response.twoFactorToken);
        setOtpHint(response.message || null);
        const devCode = response.otp || response.code;
        setDevOtp(devCode && /^\d{6}$/.test(String(devCode)) ? String(devCode) : null);
        setOtpCode('');
        setStep('verify_otp');
        return;
      }

      await finalizeLogin();
    } catch (err: any) {
      if (err?.response?.status === 429) {
        startCooldown();
        setError(null);
      } else {
        setError(err.response?.data?.message || err.message || t.login.invalidCredentials);
      }
      setStep('credentials');
    } finally {
      stopLoading();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isRateLimited) return;
    setError(null);
    startLoadingWithSlowHint();

    try {
      await authService.verifyAdminOtp({
        twoFactorToken,
        otp: otpCode,
      });
      await finalizeLogin();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.message ||
        (Array.isArray(data?.data) ? data.data.map((d: { message?: string }) => d.message).join(', ') : null) ||
        data?.error ||
        err?.message ||
        t.login.otpInvalid;
      setError(msg);
    } finally {
      stopLoading();
    }
  };

  const finalizeLogin = async () => {
    const profile = await authService.getCurrentUser();
    const role = String(profile?.user?.role || profile?.role || '')
      .toLowerCase()
      .replace(/[_ ]/g, '');
    persistLoginEmail(email);
    await resolveCurrentUserId();

    if (role === 'admin' || role === 'superadmin') {
      onLoginSuccess();
    } else {
      await authService.logout();
      setError(t.login.accessDenied);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setOtpCode('');
    setError(null);
    setTwoFactorToken('');
    setOtpHint(null);
    setDevOtp(null);
  };

  const handleResendOtp = async () => {
    if (isLoading || isRateLimited) return;
    setError(null);
    startLoadingWithSlowHint();
    try {
      const response = await authService.login({ email, password });
      if ((response.requiresOtp || response.requiresTwoFactor) && response.twoFactorToken) {
        setTwoFactorToken(response.twoFactorToken);
        setOtpHint(response.message || t.login.otpResent);
        const devCode = response.otp || response.code;
        setDevOtp(devCode && /^\d{6}$/.test(String(devCode)) ? String(devCode) : null);
        setOtpCode('');
      } else if (response.token) {
        await finalizeLogin();
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        startCooldown();
        setError(null);
      } else {
        setError(err.response?.data?.message || err.message || t.login.invalidCredentials);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = `w-full py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-900 transition-all placeholder:text-gray-400 font-medium ${isRTL ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`;
  const iconClass = `absolute top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors ${isRTL ? 'right-4' : 'left-4'}`;

  return (
    <div className={`flex min-h-screen bg-white ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">
        <div className={`absolute top-8 ${isRTL ? 'left-8 sm:left-16' : 'right-8 sm:right-16'} z-50`}>
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLangMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
            >
              <LanguageIcon fontSize="small" className="text-blue-600" />
              <span>{languageOptions.find((l) => l.code === language)?.flag}</span>
              <span className="hidden sm:inline">
                {languageOptions.find((l) => l.code === language)?.label}
              </span>
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
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      onClick={() => {
                        setLanguage(option.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                        language === option.code
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{option.flag}</span>
                        <span>{option.label}</span>
                      </span>
                      {language === option.code && (
                        <Check fontSize="small" className="text-blue-600 shrink-0" />
                      )}
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
            <h1
              className={`text-4xl font-extrabold text-gray-900 tracking-tight mb-3 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t.login.welcome}
            </h1>
            <p className={`text-gray-500 text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.login.subtitle}
            </p>
          </div>

          {isSlowServer && !isRateLimited && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-blue-700 rounded-full animate-spin shrink-0" />
              <span>Server is waking up — this may take up to 30 seconds. Please don't click again.</span>
            </motion.div>
          )}

          {isRateLimited && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium relative overflow-hidden"
            >
              <div
                className={`w-1 h-full bg-amber-400 rounded-full absolute top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'}`}
              />
              <span className={`block ${isRTL ? 'pr-3 text-right' : 'pl-3'}`}>
                Too many login attempts. Please wait{' '}
                <span className="font-bold tabular-nums">{rateLimitCountdown}s</span>{' '}
                before trying again.
              </span>
            </motion.div>
          )}

          {error && !isRateLimited && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium relative overflow-hidden"
            >
              <div
                className={`w-1 h-full bg-red-500 rounded-full absolute top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'}`}
              />
              <span className={`block ${isRTL ? 'pr-3 text-right' : 'pl-3'}`}>{error}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 'credentials' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit}
                className="space-y-5"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div>
                  <label
                    className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
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
                  <label
                    className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
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
                      <input
                        type="checkbox"
                        className="peer w-5 h-5 appearance-none rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                      />
                      <svg
                        className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                      {t.login.rememberMe}
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {t.login.forgotPassword}
                  </a>
                </div>

                <motion.button
                  whileHover={isRateLimited || isLoading ? {} : { scale: 1.01 }}
                  whileTap={isRateLimited || isLoading ? {} : { scale: 0.99 }}
                  disabled={isLoading || isRateLimited}
                  className={`w-full mt-4 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group ${
                    isRateLimited
                      ? 'bg-amber-400 text-white shadow-amber-400/30'
                      : 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-700'
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isRateLimited ? (
                    <span className="tabular-nums">Try again in {rateLimitCountdown}s</span>
                  ) : (
                    <>
                      <span>{t.login.signIn}</span>
                      <ArrowForward
                        fontSize="small"
                        className={`${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'} transition-transform`}
                      />
                    </>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-5"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-full mb-4">
                    <MarkEmailRead fontSize="large" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{t.login.otpTitle}</h3>
                  <p className="text-gray-500 text-sm mt-2">{otpHint || t.login.otpSubtitle}</p>
                  <p className="text-gray-400 text-xs mt-1">{t.login.otpExpiry}</p>
                  {devOtp && (
                    <p className="mt-3 text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                      {t.login.devOtpLabel}: {devOtp}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t.login.otpLabel}
                  </label>
                  <div className="relative group">
                    <Lock className={iconClass} fontSize="small" />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className={`${inputClass} tracking-[0.6em] text-center font-bold text-xl`}
                      placeholder="••••••"
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className={`w-full mt-4 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 group ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t.login.verifyOtp}</span>
                      <ArrowForward
                        fontSize="small"
                        className={`${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'} transition-transform`}
                      />
                    </>
                  )}
                </motion.button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {t.login.backToLogin}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading || isRateLimited}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRateLimited ? `${rateLimitCountdown}s` : t.login.resendOtp}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-sm text-gray-500">
            {t.login.trouble}{' '}
            <a href="#" className="text-blue-600 font-medium hover:underline">
              {t.login.contactAdmin}
            </a>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block w-1/2 relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2000&auto=format&fit=crop"
          alt="Travel Destination"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div
          className={`absolute bottom-0 p-16 z-20 w-full ${isRTL ? 'right-0 text-right' : 'left-0 text-left'}`}
        >
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
                <>
                  أدِر <span className="text-blue-400">وكالاتك</span> وعروضك العالمية.
                </>
              ) : language === 'fr' ? (
                <>
                  Gérez vos <span className="text-blue-400">agences</span> et offres mondiales.
                </>
              ) : (
                <>
                  Manage your <span className="text-blue-400">agencies</span> <br />
                  and global offers.
                </>
              )}
            </h2>
            <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
              {language === 'ar'
                ? 'المركز المركزي لعمليات سياحة بُراق.'
                : language === 'fr'
                  ? 'Le centre de commande pour les opérations de voyage Buraq.'
                  : 'The centralized command center for Buraq travel operations.'}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

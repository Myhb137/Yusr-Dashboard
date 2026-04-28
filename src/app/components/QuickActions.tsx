import { motion } from 'motion/react';
import { Add, TrendingUp, Settings, FlightTakeoff } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';

interface QuickActionsProps {
  onCreateOffer: () => void;
}

export function QuickActions({ onCreateOffer }: QuickActionsProps) {
  const { t, isRTL } = useLanguage();

  const actions = [
    {
      id: 1,
      title: t.offers.createOffer,
      subtitle: t.modal.offerNamePlaceholder,
      icon: Add,
      action: 'createOffer',
    },
    {
      id: 2,
      title: t.sidebar.analytics,
      subtitle: t.topbar.analytics.subtitle,
      icon: TrendingUp,
      action: 'analytics',
    },
    {
      id: 3,
      title: t.sidebar.settings,
      subtitle: t.topbar.settings.subtitle,
      icon: Settings,
      action: 'settings',
    },
  ];

  const heading =
    t.language.en === 'English'
      ? t.language.ar === 'العربية' && isRTL
        ? 'هل أنت مستعد لتنمية أعمالك؟'
        : 'Ready to grow your business?'
      : 'Prêt à développer votre activité ?';

  const subheading =
    isRTL
      ? 'أنشئ عروضاً جديدة وابلغ مسافرين أكثر'
      : t.language.fr === 'Français' && !isRTL && t.language.label === 'Langue'
        ? 'Créez de nouvelles offres et atteignez plus de voyageurs'
        : 'Create new offers and reach more travelers';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl shadow-blue-600/30 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Decorative Icon */}
      <FlightTakeoff
        className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} text-white opacity-20 transform ${isRTL ? '-rotate-12' : 'rotate-12'}`}
        style={{ fontSize: '120px' }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h3 className="text-3xl font-bold text-white mb-2">{t.overview.createOffer}?</h3>
          <p className="text-blue-100">{t.modal.offerNamePlaceholder}</p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                onClick={() => action.action === 'createOffer' && onCreateOffer()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className={`bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 transition-all hover:shadow-xl ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center mb-4 ${isRTL ? 'mr-auto' : ''}`}>
                  <Icon className="text-white text-2xl" />
                </div>
                <h4 className="font-bold text-white mb-1">{action.title}</h4>
                <p className="text-sm text-blue-100">{action.subtitle}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
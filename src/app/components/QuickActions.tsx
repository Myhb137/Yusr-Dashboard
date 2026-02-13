import { motion } from 'motion/react';
import { Add, TrendingUp, Settings, FlightTakeoff } from '@mui/icons-material';

interface ActionCard {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
}

const actions: ActionCard[] = [
  {
    id: 1,
    title: 'Create New Offer',
    subtitle: 'Add a new travel package',
    icon: Add,
    action: 'createOffer',
  },
  {
    id: 2,
    title: 'View Analytics',
    subtitle: 'Check your performance',
    icon: TrendingUp,
    action: 'analytics',
  },
  {
    id: 3,
    title: 'Manage Settings',
    subtitle: 'Update your preferences',
    icon: Settings,
    action: 'settings',
  },
];

interface QuickActionsProps {
  onCreateOffer: () => void;
}

export function QuickActions({ onCreateOffer }: QuickActionsProps) {
  const handleActionClick = (actionType: string) => {
    if (actionType === 'createOffer') {
      onCreateOffer();
    }
    // Add other actions as needed
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl shadow-blue-600/30 overflow-hidden"
    >
      {/* Decorative Icon */}
      <FlightTakeoff className="absolute top-8 right-8 text-white opacity-20 transform rotate-12" style={{ fontSize: '120px' }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-white mb-2">Ready to grow your business?</h3>
          <p className="text-blue-100">Create new offers and reach more travelers</p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;

            return (
              <motion.button
                key={action.id}
                onClick={() => handleActionClick(action.action)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-left transition-all hover:shadow-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center mb-4">
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
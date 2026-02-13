import { motion } from 'motion/react';
import { Menu, Notifications, Add } from '@mui/icons-material';

interface TopBarProps {
  onMenuToggle: () => void;
  activeTab: string;
}

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  overview: { title: 'Dashboard Overview', subtitle: 'Welcome back, Ahmed!' },
  offers: { title: 'My Offers', subtitle: 'Manage your travel packages' },
  bookings: { title: 'Bookings', subtitle: 'Track customer reservations' },
  analytics: { title: 'Analytics', subtitle: 'Performance insights' },
  settings: { title: 'Settings', subtitle: 'Manage your preferences' },
};

export function TopBar({ onMenuToggle, activeTab }: TopBarProps) {
  const { title, subtitle } = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu className="text-gray-700" />
          </motion.button>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Notifications className="text-gray-700 text-2xl" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </motion.button>

          {/* New Offer Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all font-medium"
          >
            <Add className="text-xl" />
            <span>New Offer</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import bouraqLogo from '../../assets/buraq-blue.png';
import {
  Dashboard,
  Inventory2,
  People,
  TrendingUp,
  Settings,
  ExitToApp,
  Close,
  AdminPanelSettings
} from '@mui/icons-material';
import { authService } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ isOpen, onToggle, activeTab, onTabChange, onLogout }: SidebarProps) {
  const { t, isRTL } = useLanguage();
  const [user, setUser] = useState<any>(() => authService.getStoredUser());

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (userData && !userData.error) {
          setUser(userData.user || userData);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  const menuItems = [
    { id: 'overview', label: t.sidebar.overview, icon: Dashboard },
    { id: 'offers', label: t.sidebar.myOffers, icon: Inventory2 },
    { id: 'bookings', label: t.sidebar.bookings, icon: People },
    { id: 'analytics', label: t.sidebar.analytics, icon: TrendingUp },
    { id: 'settings', label: t.sidebar.settings, icon: Settings },
  ];

  const superAdminOnlyItems = [
    { id: 'admins', label: t.sidebar.platformManagement, icon: AdminPanelSettings },
  ];

  const currentRole = String(user?.role || user?.user_metadata?.role || user?.app_metadata?.role || '').toLowerCase().replace(/[_ ]/g, '');
  const allItems = currentRole === 'superadmin' ? [...menuItems, ...superAdminOnlyItems] : menuItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : (isRTL ? 300 : -300) }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className={`fixed lg:relative inset-y-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} w-72 bg-white/80 backdrop-blur-xl border-gray-200/50 shadow-xl z-50 flex flex-col lg:translate-x-0`}
      >
        {/* Logo Area */}
        <div className="p-6 border-b border-gray-200/50">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <img src={bouraqLogo} alt="Buraq" className="h-14 w-auto object-contain" />
              <p className="text-xs text-gray-500 mt-1">{t.sidebar.agencyPortal}</p>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Close className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {allItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: isRTL ? -4 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  isRTL ? 'flex-row-reverse text-right' : 'text-left'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="text-2xl shrink-0" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200/50">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-medium text-sm text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'email@buraq.dz'}</p>
            </div>
          </motion.div>

          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-600 transition-all font-medium ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ExitToApp className="text-xl" />
            <span>{t.sidebar.logout}</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
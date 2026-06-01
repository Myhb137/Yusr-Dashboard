import { useState } from 'react';
import { NavLink } from 'react-router';
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
  onLogout: () => void;
}

export function Sidebar({ isOpen, onToggle, onLogout }: SidebarProps) {
  const { t, isRTL } = useLanguage();
  // Use cached localStorage data — no network call needed.
  // The BookingContext handles the single /auth/user refresh per session.
  const [user] = useState<any>(() => authService.getStoredUser());

  const menuItems = [
    { path: '/overview', label: t.sidebar.overview, icon: Dashboard },
    { path: '/offers', label: t.sidebar.myOffers, icon: Inventory2 },
    { path: '/bookings', label: t.sidebar.bookings, icon: People },
    { path: '/analytics', label: t.sidebar.analytics, icon: TrendingUp },
    { path: '/settings', label: t.sidebar.settings, icon: Settings },
  ];

  const superAdminOnlyItems = [
    { path: '/admins', label: t.sidebar.platformManagement, icon: AdminPanelSettings },
  ];

  const currentRole = String(user?.role || user?.user_metadata?.role || user?.app_metadata?.role || '').toLowerCase().replace(/[_ ]/g, '');
  const allItems = currentRole === 'superadmin' ? [...menuItems, ...superAdminOnlyItems] : menuItems;

  const displayEmail = user?.email || 'email@buraq.dz';
  const rawName = user?.full_name || user?.name || `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`.trim();
  const displayName = rawName || 'User';
  const displayInitial = (rawName ? rawName.charAt(0) : displayEmail.charAt(0)).toUpperCase();

  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : (isRTL ? 300 : -300) }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className={`fixed lg:relative inset-y-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} w-72 bg-white/80 backdrop-blur-xl border-gray-200/50 shadow-xl z-50 flex flex-col shrink-0`}
      >
        <div className="p-6 border-b border-gray-200/50">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <img src={bouraqLogo} alt="Buraq" className="h-14 w-auto object-contain" />
              <p className="text-xs text-gray-500 mt-1">{t.sidebar.agencyPortal}</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Close className="text-gray-600" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={({ isActive }) =>
                  `w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    isRTL ? 'flex-row-reverse text-right' : 'text-left'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <motion.span
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: isRTL ? -4 : 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Icon className="text-2xl shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    {isActive && <span className="sr-only"> (current)</span>}
                  </motion.span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200/50">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
              {displayInitial}
            </div>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-medium text-sm text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {currentRole === 'superadmin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          </motion.div>

          <motion.button
            type="button"
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

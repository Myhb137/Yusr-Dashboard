import { motion } from 'motion/react';
import { Menu, Notifications } from '@mui/icons-material';

interface TopBarProps {
  onMenuToggle: () => void;
  activeTab: string;
}

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  overview: { title: 'Dashboard Overview', subtitle: 'Welcome back!' },
  offers: { title: 'My Offers', subtitle: 'Manage your travel packages' },
  bookings: { title: 'Bookings', subtitle: 'Track customer reservations' },
  analytics: { title: 'Analytics', subtitle: 'Performance insights' },
  admins: { title: 'Platform Management', subtitle: 'Review agencies and global offers' },
  settings: { title: 'Settings', subtitle: 'Manage your preferences' },
};

export function TopBar({ onMenuToggle, activeTab }: TopBarProps) {
  const { title, subtitle } = tabTitles[activeTab] || tabTitles.overview;

  // Read stored user to display role
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const role: string = storedUser?.role || 'unknown';
  const isAdmin = role === 'admin' || role === 'superadmin';

  return (
    <>
      {/* Role warning banner — shown when account is not admin */}
      {!isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-800 text-sm">
          <span className="font-bold">⚠️ Limited Access:</span>
          <span>
            Your account role is <strong className="font-mono">"{role}"</strong>.
            Creating or editing offers requires <strong>Admin</strong> role.
            Please contact your <strong>Super Admin</strong> to request access.
          </span>
        </div>
      )}

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
            {/* Role Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${
                isAdmin
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              {isAdmin ? '✓ Admin' : `✗ ${role}`}
            </span>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Notifications className="text-gray-700 text-2xl" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </motion.button>
          </div>
        </div>
      </header>
    </>
  );
}
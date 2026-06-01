import { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { CreateOfferModal } from '../components/CreateOfferModal';
import { authService } from '../services/authService';

// ── Lazy-loaded pages: only fetched when the user navigates to the route ──
const DashboardOverview = lazy(() =>
  import('../components/DashboardOverview').then((m) => ({ default: m.DashboardOverview }))
);
const MyOffers = lazy(() =>
  import('../components/MyOffers').then((m) => ({ default: m.MyOffers }))
);
const Bookings = lazy(() =>
  import('../components/Bookings').then((m) => ({ default: m.Bookings }))
);
const Analytics = lazy(() =>
  import('../components/Analytics').then((m) => ({ default: m.Analytics }))
);
const Settings = lazy(() =>
  import('../components/Settings').then((m) => ({ default: m.Settings }))
);
const AdminManagement = lazy(() =>
  import('../components/AdminManagement').then((m) => ({ default: m.AdminManagement }))
);

// Lightweight fallback shown while a lazy chunk is loading
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading…</span>
      </div>
    </div>
  );
}

function tabFromPath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] || 'overview';
  const allowed = ['overview', 'offers', 'bookings', 'analytics', 'settings', 'admins'];
  return allowed.includes(segment) ? segment : 'overview';
}

interface DashboardLayoutProps {
  onLogout: () => void;
}

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const location = useLocation();
  const activeTab = tabFromPath(location.pathname);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [refreshOffersTrigger, setRefreshOffersTrigger] = useState(0);

  // Auto-restore sidebar when resizing back to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const user = authService.getStoredUser();
  const role = String(
    user?.role || user?.user_metadata?.role || user?.app_metadata?.role || ''
  ).toLowerCase().replace(/[_ ]/g, '');
  const isSuperAdmin = role === 'superadmin';

  const openOfferModal = useCallback((offer: any = null) => {
    setEditingOffer(offer);
    setIsCreateOfferModalOpen(true);
  }, []);

  const closeOfferModal = useCallback(() => {
    setEditingOffer(null);
    setIsCreateOfferModalOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} activeTab={activeTab} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<DashboardOverview onCreateOffer={() => openOfferModal()} />} />
              <Route
                path="/offers"
                element={
                  <MyOffers
                    onCreateOffer={() => openOfferModal()}
                    onEditOffer={(offer) => openOfferModal(offer)}
                    refreshTrigger={refreshOffersTrigger}
                  />
                }
              />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              {isSuperAdmin ? (
                <Route path="/admins" element={<AdminManagement />} />
              ) : (
                <Route path="/admins" element={<Navigate to="/overview" replace />} />
              )}
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <CreateOfferModal
        isOpen={isCreateOfferModalOpen}
        onClose={closeOfferModal}
        offer={editingOffer}
        onSuccess={() => setRefreshOffersTrigger((prev) => prev + 1)}
      />
    </div>
  );
}

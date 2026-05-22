import { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { DashboardOverview } from '../components/DashboardOverview';
import { MyOffers } from '../components/MyOffers';
import { Bookings } from '../components/Bookings';
import { Analytics } from '../components/Analytics';
import { Settings } from '../components/Settings';
import { AdminManagement } from '../components/AdminManagement';
import { CreateOfferModal } from '../components/CreateOfferModal';
import { authService } from '../services/authService';

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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [refreshOffersTrigger, setRefreshOffersTrigger] = useState(0);

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

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { MyOffers } from './components/MyOffers';
import { Bookings } from './components/Bookings';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { CreateOfferModal } from './components/CreateOfferModal';
import { Login } from './components/Login';
import { AdminManagement } from './components/AdminManagement';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [refreshOffersTrigger, setRefreshOffersTrigger] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const openOfferModal = (offer: any = null) => {
    setEditingOffer(offer);
    setIsCreateOfferModalOpen(true);
  };

  const closeOfferModal = () => {
    setEditingOffer(null);
    setIsCreateOfferModalOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Close sidebar on mobile when tab is selected
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview onCreateOffer={() => openOfferModal()} />;
      case 'offers':
        return (
          <MyOffers 
            onCreateOffer={() => openOfferModal()} 
            onEditOffer={(offer) => openOfferModal(offer)} 
            refreshTrigger={refreshOffersTrigger} 
          />
        );
      case 'bookings':
        return <Bookings />;
      case 'analytics':
        return <Analytics />;
      case 'admins':
        return <AdminManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview onCreateOffer={() => openOfferModal()} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <Login 
        onLoginSuccess={() => setIsAuthenticated(true)} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} activeTab={activeTab} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={isCreateOfferModalOpen}
        onClose={closeOfferModal}
        offer={editingOffer}
        onSuccess={() => setRefreshOffersTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
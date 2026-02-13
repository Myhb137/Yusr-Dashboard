import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { MyOffers } from './components/MyOffers';
import { Bookings } from './components/Bookings';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { CreateOfferModal } from './components/CreateOfferModal';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);

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
        return <DashboardOverview onCreateOffer={() => setIsCreateOfferModalOpen(true)} />;
      case 'offers':
        return <MyOffers onCreateOffer={() => setIsCreateOfferModalOpen(true)} />;
      case 'bookings':
        return <Bookings />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview onCreateOffer={() => setIsCreateOfferModalOpen(true)} />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
        onClose={() => setIsCreateOfferModalOpen(false)}
      />
    </div>
  );
}
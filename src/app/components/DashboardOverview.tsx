import { StatCard } from './StatCard';
import { RecentBookings } from './RecentBookings';
import { TopOffers } from './TopOffers';
import { QuickActions } from './QuickActions';
import { AttachMoney, Inventory2, People } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { bookingService } from '../services/bookingService';
import { offerService } from '../services/offerService';
import { isSuperAdmin } from '../utils/authRole';
import { resolveAdminTenant } from '../utils/tenantScope';
import { useLanguage } from '../context/LanguageContext';
import { useBookings } from '../context/useBookings';


interface DashboardOverviewProps {
  onCreateOffer: () => void;
}

export function DashboardOverview({ onCreateOffer }: DashboardOverviewProps) {
  const { t } = useLanguage();
  const { refreshBookings } = useBookings();
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trigger bookings fetch when the overview page mounts so RecentBookings has data
  useEffect(() => {
    refreshBookings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        const tenant = await resolveAdminTenant();
        const isSuper = isSuperAdmin(tenant.role);

        const [bookingsRes, offersRes] = await Promise.allSettled([
          isSuper ? bookingService.getAllBookings() : bookingService.getDashboardBookings(tenant),
          isSuper ? offerService.getAllOffers() : offerService.getDashboardOffers(tenant),
        ]);

        const myBookings =
          bookingsRes.status === 'fulfilled' ? (bookingsRes.value as any[]) : [];
        const myOffers =
          offersRes.status === 'fulfilled' ? (offersRes.value as any[]) : [];

        // Calculate unique customers
        const uniqueCustomers = new Set(myBookings.map(b => {
          const uid = b.user_id || b.userId || (typeof b.user === 'object' ? (b.user._id || b.user.id) : b.user);
          return String(uid);
        })).size;

        setStatsData({
          totalRevenue: myBookings.reduce((acc, b) => acc + Number(b.total_price || b.totalAmount || b.amount || 0), 0),
          activeOffers: myOffers.filter(o => o.available === true || o.status === 'active' || o.isActive).length,
          totalBookings: myBookings.length,
          totalUsers: uniqueCustomers,
          revenueChange: '+0%',
          offersChange: '0',
          bookingsChange: '+0%',
          usersChange: '+0',
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      id: 1,
      title: t.overview.totalRevenue,
      value: statsData?.totalRevenue !== undefined ? `${statsData.totalRevenue.toLocaleString()} DZD` : '0 DZD',
      change: statsData?.revenueChange || '0%',
      trend: (statsData?.revenueChange || '').startsWith('-') ? 'down' : 'up',
      icon: AttachMoney,
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-600',
      bgGradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 2,
      title: t.overview.activeOffers,
      value: statsData?.activeOffers?.toString() || '0',
      change: statsData?.offersChange || '0',
      trend: (statsData?.offersChange || '').startsWith('-') ? 'down' : 'up',
      icon: Inventory2,
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-indigo-600',
      bgGradient: 'from-blue-600 to-indigo-600',
    },
    {
      id: 3,
      title: t.overview.totalBookings,
      value: statsData?.totalBookings?.toLocaleString() || '0',
      change: statsData?.bookingsChange || '0%',
      trend: (statsData?.bookingsChange || '').startsWith('-') ? 'down' : 'up',
      icon: People,
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-600',
      bgGradient: 'from-purple-500 to-pink-600',
    },
    {
      id: 4,
      title: t.overview.totalUsers,
      value: statsData?.totalUsers?.toString() || '0',
      change: statsData?.usersChange || '0',
      trend: (statsData?.usersChange || '').startsWith('-') ? 'down' : 'up',
      icon: People,
      gradientFrom: 'from-orange-400',
      gradientTo: 'to-red-500',
      bgGradient: 'from-orange-400 to-red-500',
    },
  ];
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={stat.id} {...stat} index={index} />
        ))}
      </div>

      {/* Bookings & Top Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RecentBookings />
        </div>
        <div className="lg:col-span-1">
          <TopOffers />
        </div>
      </div>

      {/* Quick Actions Banner */}
      <QuickActions onCreateOffer={onCreateOffer} />
    </>
  );
}
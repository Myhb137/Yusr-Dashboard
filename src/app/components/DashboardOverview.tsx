import { StatCard } from './StatCard';
import { RecentBookings } from './RecentBookings';
import { TopOffers } from './TopOffers';
import { QuickActions } from './QuickActions';
import { AttachMoney, Inventory2, People, Pending } from '@mui/icons-material';

interface Stat {
  id: number;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  bgGradient: string;
}

const stats: Stat[] = [
  {
    id: 1,
    title: 'Total Revenue',
    value: '$45,231',
    change: '+12.5%',
    trend: 'up',
    icon: AttachMoney,
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
    bgGradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 2,
    title: 'Active Offers',
    value: '24',
    change: '+3',
    trend: 'up',
    icon: Inventory2,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-indigo-600',
    bgGradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 3,
    title: 'Total Bookings',
    value: '1,429',
    change: '+8.2%',
    trend: 'up',
    icon: People,
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-600',
    bgGradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 4,
    title: 'Pending Reviews',
    value: '12',
    change: '-2',
    trend: 'down',
    icon: Pending,
    gradientFrom: 'from-orange-400',
    gradientTo: 'to-red-500',
    bgGradient: 'from-orange-400 to-red-500',
  },
];

interface DashboardOverviewProps {
  onCreateOffer: () => void;
}

export function DashboardOverview({ onCreateOffer }: DashboardOverviewProps) {
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
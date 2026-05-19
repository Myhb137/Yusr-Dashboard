import { motion } from 'motion/react';
import {
  TrendingUp,
  AttachMoney,
  People,
  Inventory2,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { bookingService } from '../services/bookingService';
import { offerService } from '../services/offerService';
import { authService } from '../services/authService';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#0046A8', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topDestinationsData, setTopDestinationsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);

        const user = authService.getStoredUser();
        const currentUserId = user?._id || user?.id;
        const currentRole = String(
          user?.role || user?.user_metadata?.role || user?.app_metadata?.role || ''
        ).toLowerCase().replace(/[_ ]/g, '');

        // Helper: extract ID
        const extractId = (obj: any, ...keys: string[]): string | null => {
          if (!obj) return null;
          for (const key of keys) {
            const val = obj[key];
            if (!val) continue;
            if (typeof val === 'string' && val.length > 0) return val;
            const id = val?._id || val?.id;
            if (id) return String(id);
          }
          return null;
        };

        // Fetch all bookings and offers to compute multi-tenant stats
        const [bookingsRes, offersRes] = await Promise.allSettled([
          bookingService.getAllBookings(),
          offerService.getAllOffers(),
        ]);

        let bookingsArray: any[] = [];
        let offersArray: any[] = [];

        if (bookingsRes.status === 'fulfilled') {
          const raw = bookingsRes.value;
          bookingsArray = Array.isArray(raw) ? raw : (raw?.bookings || raw?.data || []);
        }
        if (offersRes.status === 'fulfilled') {
          const raw = offersRes.value;
          offersArray = Array.isArray(raw) ? raw : (raw?.offers || raw?.data || []);
        }

        // --- Filter for Admin Multi-tenancy ---
        if (currentRole !== 'superadmin' && currentUserId) {
          // 1. Filter my offers
          const myOffers = offersArray.filter((o: any) => {
            const ownerId = o.user_id || o.userId || o.admin_id || o.created_by;
            const ownerIdStr = typeof ownerId === 'object' ? (ownerId._id || ownerId.id) : ownerId;
            return String(ownerIdStr) === String(currentUserId);
          });
          const myOfferIds = myOffers.map((o: any) => String(o.id || o._id));
          offersArray = myOffers;

          // 2. Filter bookings for my offers
          bookingsArray = bookingsArray.filter((b: any) => {
            const oid = extractId(b, 'offer_id', 'offerId', 'offer');
            return oid && myOfferIds.includes(oid);
          });
        }

        // --- Calculate Stats Cards ---
        const totalRevenue = bookingsArray.reduce((acc, b) => acc + Number(b.total_price || b.totalAmount || b.amount || 0), 0);
        const uniqueCustomers = new Set(bookingsArray.map(b => extractId(b, 'user_id', 'userId', 'user'))).size;
        
        setStats({
          revenue: totalRevenue,
          bookings: bookingsArray.length,
          customers: uniqueCustomers,
          activeOffers: offersArray.filter(o => o.available === true || o.status === 'active').length,
        });

        // --- Build chart data from bookings ---
        const currentYear = new Date().getFullYear();
        const monthlyMap: Record<number, { revenue: number; bookings: number }> = {};
        for (let i = 0; i < 12; i++) monthlyMap[i] = { revenue: 0, bookings: 0 };

        bookingsArray.forEach((b: any) => {
          const dateStr = b.created_at || b.createdAt || b.startDate || b.start_date || b.booking_date;
          if (!dateStr) return;
          const d = new Date(dateStr);
          if (d.getFullYear() !== currentYear) return;
          const m = d.getMonth();
          monthlyMap[m].bookings += 1;
          monthlyMap[m].revenue += Number(b.total_price || b.totalAmount || b.amount || 0);
        });

        setRevenueData(
          MONTHS.map((month, i) => ({
            month,
            bookings: monthlyMap[i].bookings,
            revenue: monthlyMap[i].revenue,
          }))
        );

        // --- Category distribution ---
        const typeCounts: Record<string, number> = {};
        bookingsArray.forEach((b: any) => {
          const type = (typeof b.offer === 'object' ? b.offer?.type : null) || b.offerType || b.offer_type || 'standard';
          const t = String(type).toLowerCase();
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });

        setCategoryData(
          Object.entries(typeCounts).map(([name, value], i) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: PIE_COLORS[i % PIE_COLORS.length],
          }))
        );

        // --- Top Destinations ---
        const destCounts: Record<string, number> = {};
        bookingsArray.forEach((b: any) => {
          const dest = (typeof b.offer === 'object' ? b.offer?.location : null) || b.location || b.destination || 'Other';
          destCounts[dest] = (destCounts[dest] || 0) + 1;
        });

        setTopDestinationsData(
          Object.entries(destCounts)
            .map(([destination, bookings]) => ({ destination, bookings }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 5)
        );

      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const totalRevenue = revenueData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
  const totalBookings = revenueData.reduce((sum: number, m: any) => sum + (m.bookings || 0), 0);
  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  const performanceMetrics = [
    {
      id: 1,
      title: 'Total Revenue',
      value: (stats?.totalRevenue !== undefined ? stats.totalRevenue : totalRevenue).toLocaleString() + ' DZD',
      change: stats?.revenueChange || '+0%',
      trend: (stats?.revenueChange || '').startsWith('-') ? 'down' : 'up',
      icon: AttachMoney,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 2,
      title: 'Total Bookings',
      value: (stats?.totalBookings ?? totalBookings).toLocaleString(),
      change: stats?.bookingsChange || '+0%',
      trend: (stats?.bookingsChange || '').startsWith('-') ? 'down' : 'up',
      icon: People,
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      id: 3,
      title: 'Active Offers',
      value: (stats?.activeOffers ?? 0).toString(),
      change: stats?.offersChange || '+0',
      trend: (stats?.offersChange || '').startsWith('-') ? 'down' : 'up',
      icon: Inventory2,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      id: 4,
      title: 'Avg Booking Value',
      value: (stats?.avgBookingValue !== undefined ? stats.avgBookingValue : avgBookingValue).toLocaleString() + ' DZD',
      change: stats?.avgValueChange || '+0%',
      trend: (stats?.avgValueChange || '').startsWith('-') ? 'down' : 'up',
      icon: TrendingUp,
      gradient: 'from-orange-400 to-red-500',
    },
  ];
  return (
    <div>
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {performanceMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white text-2xl" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${metric.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {metric.trend === 'up' ? <ArrowUpward className="text-sm" /> : <ArrowDownward className="text-sm" />}
                  <span className="text-xs font-semibold">{metric.change}</span>
                </div>
              </div>
              <h3 className="text-sm text-gray-500 mb-1">{metric.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue & Bookings Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-md mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Revenue & Bookings Trend</h2>
            <p className="text-sm text-gray-500">Monthly performance over the year</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0046A8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0046A8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0046A8"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue (DZD)"
            />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="#8B5CF6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorBookings)"
              name="Bookings"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Category Distribution & Top Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-md"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-1">Category Distribution</h2>
          <p className="text-sm text-gray-500 mb-6">Booking breakdown by category</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Destinations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-md"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-1">Top Destinations</h2>
          <p className="text-sm text-gray-500 mb-6">Most popular travel destinations</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDestinationsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
              <YAxis dataKey="destination" type="category" stroke="#6B7280" style={{ fontSize: '12px' }} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="bookings" fill="#0046A8" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Monthly Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-md"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">Monthly Revenue Comparison</h2>
        <p className="text-sm text-gray-500 mb-6">Track your revenue growth month by month</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Revenue (DZD)" />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0046A8" />
                <stop offset="100%" stopColor="#4F46E5" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

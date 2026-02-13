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
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
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

const revenueData = [
  { month: 'Jan', revenue: 28000, bookings: 45 },
  { month: 'Feb', revenue: 32000, bookings: 52 },
  { month: 'Mar', revenue: 35000, bookings: 58 },
  { month: 'Apr', revenue: 42000, bookings: 68 },
  { month: 'May', revenue: 48000, bookings: 75 },
  { month: 'Jun', revenue: 55000, bookings: 88 },
  { month: 'Jul', revenue: 62000, bookings: 98 },
  { month: 'Aug', revenue: 58000, bookings: 92 },
  { month: 'Sep', revenue: 65000, bookings: 102 },
  { month: 'Oct', revenue: 70000, bookings: 110 },
  { month: 'Nov', revenue: 75000, bookings: 118 },
  { month: 'Dec', revenue: 82000, bookings: 128 },
];

const categoryData = [
  { name: 'City Tour', value: 35, color: '#0046A8' },
  { name: 'Beach', value: 25, color: '#06B6D4' },
  { name: 'Adventure', value: 20, color: '#8B5CF6' },
  { name: 'Luxury', value: 12, color: '#F59E0B' },
  { name: 'Cultural', value: 8, color: '#EC4899' },
];

const topDestinationsData = [
  { destination: 'Paris', bookings: 145 },
  { destination: 'Dubai', bookings: 132 },
  { destination: 'Tokyo', bookings: 118 },
  { destination: 'London', bookings: 98 },
  { destination: 'Santorini', bookings: 103 },
  { destination: 'Maldives', bookings: 78 },
];

const performanceMetrics = [
  {
    id: 1,
    title: 'Total Revenue',
    value: '$652,000',
    change: '+24.5%',
    trend: 'up',
    icon: AttachMoney,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 2,
    title: 'Total Bookings',
    value: '1,034',
    change: '+18.2%',
    trend: 'up',
    icon: People,
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 3,
    title: 'Active Offers',
    value: '24',
    change: '+3',
    trend: 'up',
    icon: Inventory2,
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 4,
    title: 'Avg Booking Value',
    value: '$631',
    change: '+5.4%',
    trend: 'up',
    icon: TrendingUp,
    gradient: 'from-orange-400 to-red-500',
  },
];

export function Analytics() {
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
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              2024
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              2023
            </button>
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
              name="Revenue ($)"
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
                {categoryData.map((entry, index) => (
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
            <Bar dataKey="revenue" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Revenue ($)" />
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

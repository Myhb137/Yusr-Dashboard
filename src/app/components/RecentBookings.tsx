import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Pending, Cancel, MoreVert } from '@mui/icons-material';
import { bookingService } from '../services/bookingService';

interface Booking {
  id: number;
  customer: string;
  offer: string;
  date: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  avatar: string;
}

const statusConfig = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
  },
  pending: {
    label: 'Pending',
    icon: Pending,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Cancel,
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
};

const gradients = [
  'from-blue-600 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-400 to-red-500',
  'from-pink-500 to-rose-600',
  'from-indigo-600 to-purple-600',
];

export function RecentBookings() {
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        setIsLoading(true);
        const data = await bookingService.getAllBookings();
        const bookingsArray = Array.isArray(data) ? data : (data?.bookings || []);
        
        // Take topmost 6 recent bookings
        const mappedData = bookingsArray.slice(0, 6).map((booking: any) => ({
          id: booking.id || booking._id,
          customer: booking.user?.name || booking.customerName || 'Anonymous',
          offer: booking.offer?.title || booking.offerName || 'Custom Trip',
          date: booking.startDate || booking.date || '-',
          amount: booking.totalAmount !== undefined ? `${booking.totalAmount} DZD` : (booking.amount || '0 DZD'),
          status: (booking.status || 'pending') as 'confirmed' | 'pending' | 'cancelled',
          avatar: (booking.user?.name || booking.customerName || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        }));
        
        setBookingsData(mappedData);
      } catch (err) {
        console.error('Failed to fetch recent bookings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentBookings();
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Recent Bookings</h3>
        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="#"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View All →
        </motion.a>
      </div>

      {/* Table */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bookingsData.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No recent bookings</div>
        ) : (
          bookingsData.map((booking: any, index: number) => {
            const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;
            const gradientClass = gradients[index % gradients.length];

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ backgroundColor: 'rgb(249 250 251)' }}
                className="flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                >
                  {booking.avatar}
                </div>

                {/* Customer & Offer */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{booking.customer}</p>
                  <p className="text-sm text-gray-500 truncate">{booking.offer}</p>
                </div>

                {/* Date */}
                <div className="hidden md:block text-sm text-gray-600">{booking.date}</div>

                {/* Amount */}
                <div className="font-bold text-gray-900">{booking.amount}</div>

                {/* Status Badge */}
                <div
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${status.bgClass} ${status.textClass}`}
                >
                  <StatusIcon className="text-base" />
                  <span className="hidden sm:inline">{status.label}</span>
                </div>

                {/* Actions Menu */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-lg transition-all"
                >
                  <MoreVert className="text-gray-600 text-xl" />
                </motion.button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

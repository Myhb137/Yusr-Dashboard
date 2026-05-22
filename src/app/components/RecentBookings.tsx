import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Pending, Cancel, MoreVert } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';
import { useBookings } from '../context/BookingContext';

const getStatusConfig = (tBookings: any) => ({
  confirmed: { label: tBookings.confirmed, icon: CheckCircle, bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  validated: { label: tBookings.confirmed, icon: CheckCircle, bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  completed: { label: tBookings.completed, icon: CheckCircle, bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  pending:   { label: tBookings.pending,   icon: Pending,     bgClass: 'bg-amber-100',   textClass: 'text-amber-700'   },
  ready_for_agency: { label: tBookings.ready_for_agency, icon: Pending, bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  cancelled: { label: tBookings.cancelled, icon: Cancel,      bgClass: 'bg-red-100',     textClass: 'text-red-700'     },
});

const gradients = [
  'from-blue-600 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-400 to-red-500',
  'from-pink-500 to-rose-600',
  'from-indigo-600 to-purple-600',
];

export function RecentBookings() {
  const { t, isRTL } = useLanguage();
  const { bookings, isLoading } = useBookings();

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'pending':
        return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'refunded':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const recentBookings = bookings.slice(0, 6);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-xl font-bold text-gray-900">{t.overview.recentBookings}</h3>
        <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="#"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          {isRTL ? '← ' : ''}{t.common.viewDetails}{isRTL ? '' : ' →'}
        </motion.a>
      </div>

      {/* Table */}
      <div className="space-y-2">
        {isLoading && bookings.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 text-gray-500">{t.overview.noRecentBookings}</div>
        ) : (
          recentBookings.map((booking: any, index: number) => {
            const statusCfg = getStatusConfig(t.bookings);
            const status = statusCfg[booking.status as keyof typeof statusCfg] || statusCfg.pending;
            const gradientClass = gradients[index % gradients.length];
            const avatar = booking.customerName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase() || 'A';

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ backgroundColor: 'rgb(249 250 251)' }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                >
                  {avatar}
                </div>

                {/* Customer & Offer */}
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-medium text-gray-900 truncate">{booking.customerName}</p>
                  <p className="text-sm text-gray-500 truncate">{booking.offerName}</p>
                </div>

                {/* Date */}
                <div className="hidden lg:block text-sm text-gray-600 whitespace-nowrap">{booking.startDate}</div>

                {/* Amount */}
                <div className="font-bold text-gray-900 whitespace-nowrap">{booking.amount}</div>

                {/* Payment Status Badge */}
                <div className={`hidden sm:flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getPaymentStatusColor(booking.paymentStatus)}`}>
                  {booking.paymentStatus}
                </div>

                {/* Status Badge */}
                {(() => {
                  const statusConfig = getStatusConfig(t.bookings);
                  const status = statusConfig[booking.status as keyof ReturnType<typeof getStatusConfig>] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${status.bgClass} ${status.textClass} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <StatusIcon className="text-base" />
                      <span className="hidden sm:inline">{status.label}</span>
                    </div>
                  );
                })()}

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

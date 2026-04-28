import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Pending, Cancel, MoreVert } from '@mui/icons-material';
import { bookingService } from '../services/bookingService';
import { offerService } from '../services/offerService';
import { authService } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';

interface Booking {
  id: number;
  customer: string;
  offer: string;
  date: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  avatar: string;
}

const getStatusConfig = (tBookings: any) => ({
  confirmed: { label: tBookings.confirmed, icon: CheckCircle, bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  pending:   { label: tBookings.pending,   icon: Pending,     bgClass: 'bg-amber-100',   textClass: 'text-amber-700'   },
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
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        setIsLoading(true);

        // 1. Get current user
        const user = authService.getStoredUser();
        const currentUserId = user?._id || user?.id;
        const currentRole = String(user?.role || user?.user_metadata?.role || user?.app_metadata?.role || '').toLowerCase().replace(/[_ ]/g, '');

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

        // 2. Fetch bookings
        let bookingsArray: any[] = [];
        if (currentRole === 'superadmin') {
          const data = await bookingService.getAllBookings();
          bookingsArray = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
        } else if (currentRole === 'admin' && currentUserId) {
          // Admin: see bookings for THEIR offers
          const [bookingsData, offersData] = await Promise.all([
            bookingService.getAllBookings(),
            offerService.getAllOffers()
          ]);
          
          const allOffers = Array.isArray(offersData) ? offersData : (offersData?.offers || []);
          const myOfferIds = allOffers
            .filter((o: any) => {
              const ownerId = o.user_id || o.userId || o.admin_id || o.created_by;
              const ownerIdStr = typeof ownerId === 'object' ? (ownerId._id || ownerId.id) : ownerId;
              return String(ownerIdStr) === String(currentUserId);
            })
            .map((o: any) => String(o.id || o._id));

          const allBookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData?.bookings || bookingsData?.data || []);
          bookingsArray = allBookings.filter((b: any) => {
            const oid = extractId(b, 'offer_id', 'offerId', 'offer');
            return oid && myOfferIds.includes(oid);
          });
        } else if (currentUserId) {
          // Regular user: see bookings they made
          const data = await bookingService.getUserBookings(currentUserId);
          bookingsArray = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
        } else {
          const data = await bookingService.getAllBookings();
          bookingsArray = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
        }

        const recentBookings = bookingsArray.slice(0, 6);

        // Helper: extract display name — API User schema uses full_name
        const extractName = (u: any): string =>
          u?.full_name ||
          u?.name ||
          `${u?.firstName || u?.first_name || ''} ${u?.lastName || u?.last_name || ''}`.trim() ||
          u?.username ||
          u?.email?.split('@')[0] ||
          '';

        // 3. Collect unique user_id and offer_id from the 6 bookings
        const userIdSet = new Set<string>();
        const offerIdSet = new Set<string>();
        recentBookings.forEach((b: any) => {
          const uid = extractId(b, 'user_id', 'userId', 'user', 'customer_id', 'customerId');
          if (uid) userIdSet.add(uid);
          const oid = extractId(b, 'offer_id', 'offerId', 'offer');
          if (oid) offerIdSet.add(oid);
        });

        // 4. Fetch user and offer details in parallel
        const [userResults, offerResults] = await Promise.all([
          Promise.allSettled(
            [...userIdSet].map(id =>
              bookingService.getUserById(id).then(r => ({
                id,
                data: r?.user || r?.data?.user || r?.data || r,
              }))
            )
          ),
          Promise.allSettled(
            [...offerIdSet].map(id =>
              offerService.getOfferDetails(id).then(r => ({
                id,
                data: r?.offer || r?.data?.offer || r?.data || r,
              }))
            )
          ),
        ]);

        const userMap: Record<string, any> = {};
        userResults.forEach(r => {
          if (r.status === 'fulfilled') userMap[r.value.id] = r.value.data;
        });

        const offerMap: Record<string, any> = {};
        offerResults.forEach(r => {
          if (r.status === 'fulfilled') offerMap[r.value.id] = r.value.data;
        });

        // 5. Map bookings with enriched data
        const mappedData = recentBookings.map((booking: any) => {
          const uid = extractId(booking, 'user_id', 'userId', 'user', 'customer_id', 'customerId');
          const oid = extractId(booking, 'offer_id', 'offerId', 'offer');

          const u = uid ? userMap[uid] : null;
          const o = oid ? offerMap[oid] : null;

          // Fallback to embedded objects if fetch returned nothing
          const resolvedUser = u ?? (typeof booking.user === 'object' ? booking.user : null);
          const resolvedOffer = o ?? (typeof booking.offer === 'object' ? booking.offer : null);

          const customerName = extractName(resolvedUser) || booking.customerName || 'Anonymous';

          return {
            id: booking.id || booking._id,
            customer: customerName,
            offer: resolvedOffer?.title || resolvedOffer?.name || booking.offerName || 'Custom Trip',
            date: booking.startDate || booking.start_date || booking.date || '-',
            amount:
              booking.totalAmount !== undefined
                ? `${booking.totalAmount} DZD`
                : booking.total_price !== undefined
                  ? `${booking.total_price} DZD`
                  : booking.amount || '0 DZD',
            status: (booking.status || 'pending') as 'confirmed' | 'pending' | 'cancelled',
            avatar: customerName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase() || 'A',
          };
        });

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
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-xl font-bold text-gray-900">{t.overview.recentBookings}</h3>
        <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="#"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          {isRTL ? '← ' : ''}{t.common.viewDetails}{isRTL ? '' : ' →'}
        </motion.a>
      </div>

      {/* Table */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bookingsData.length === 0 ? (
          <div className="text-center py-10 text-gray-500">{t.overview.noRecentBookings}</div>
        ) : (
          bookingsData.map((booking: any, index: number) => {
            const statusCfg = getStatusConfig(t.bookings);
            const status = statusCfg[booking.status as keyof typeof statusCfg] || statusCfg.pending;
            const gradientClass = gradients[index % gradients.length];

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
                  {booking.avatar}
                </div>

                {/* Customer & Offer */}
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-medium text-gray-900 truncate">{booking.customer}</p>
                  <p className="text-sm text-gray-500 truncate">{booking.offer}</p>
                </div>

                {/* Date */}
                <div className="hidden md:block text-sm text-gray-600">{booking.date}</div>

                {/* Amount */}
                <div className="font-bold text-gray-900">{booking.amount}</div>

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

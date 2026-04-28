import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  FilterList,
  FileDownload,
  Visibility,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  AttachMoney,
  CalendarToday,
  Person,
  LocationOn,
  Phone,
  Email as EmailIcon,
  Close,
  AccountCircle
} from '@mui/icons-material';

import { bookingService } from '../services/bookingService';
import { offerService } from '../services/offerService';
import { authService } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';

interface Booking {
  id: string;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerGender?: string;
  offerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  fullUser?: any;
  offer?: any;
}

export function Bookings() {
  const { t, isRTL } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);

        // 1. Get current user
        const user = authService.getStoredUser();
        setCurrentUser(user);
        const currentUserId = user?._id || user?.id;
        const currentRole = String(
          user?.role || user?.user_metadata?.role || user?.app_metadata?.role || ''
        ).toLowerCase().replace(/[_ ]/g, '');

        // Helper: extract ID — booking schema uses flat user_id / offer_id strings
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

        // 2. Fetch bookings — superadmin gets all, admin gets bookings for their offers, user gets bookings they made
        let bookingsArray: any[] = [];

        if (currentRole === 'superadmin') {
          const data = await bookingService.getAllBookings();
          bookingsArray = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
        } else if (currentRole === 'admin' && currentUserId) {
          // Admin: needs to see bookings for THEIR offers
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
          // Fallback
          const data = await bookingService.getAllBookings();
          bookingsArray = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
        }

        // Helper: extract display name — API User schema uses full_name
        const extractName = (u: any): string =>
          u?.full_name ||
          u?.name ||
          `${u?.firstName || u?.first_name || ''} ${u?.lastName || u?.last_name || ''}`.trim() ||
          u?.username ||
          u?.email?.split('@')[0] ||
          '';

        // 3. Collect unique user and offer IDs
        // Booking schema: { user_id, offer_id, ... } (flat UUIDs)
        const userIdSet = new Set<string>();
        const offerIdSet = new Set<string>();

        bookingsArray.forEach((b: any) => {
          const uid = extractId(b, 'user_id', 'userId', 'user', 'customer_id', 'customerId');
          if (uid) userIdSet.add(uid);
          const oid = extractId(b, 'offer_id', 'offerId', 'offer');
          if (oid) offerIdSet.add(oid);
        });

        console.log('[Bookings] IDs to fetch:', { userIds: [...userIdSet], offerIds: [...offerIdSet], sample: bookingsArray[0] });

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
          else console.warn('[Bookings] user fetch failed:', r.reason?.message);
        });

        const offerMap: Record<string, any> = {};
        offerResults.forEach(r => {
          if (r.status === 'fulfilled') offerMap[r.value.id] = r.value.data;
        });

        // 5. Map bookings using enriched data
        const mappedBookings: Booking[] = bookingsArray.map((booking: any) => {
          const uid = extractId(booking, 'user_id', 'userId', 'user', 'customer_id', 'customerId');
          const oid = extractId(booking, 'offer_id', 'offerId', 'offer');

          const u = uid ? userMap[uid] : null;
          const o = oid ? offerMap[oid] : null;

          // Also check embedded objects as last resort
          const embeddedUser = typeof booking.user === 'object' ? booking.user : null;
          const embeddedOffer = typeof booking.offer === 'object' ? booking.offer : null;
          const resolvedUser = u ?? embeddedUser;
          const resolvedOffer = o ?? embeddedOffer;

          return {
            id: booking.id || booking._id,
            bookingRef:
              booking.ref ||
              booking.bookingRef ||
              `BK-${(booking.id || booking._id).toString().slice(-6).toUpperCase()}`,
            customerName: extractName(resolvedUser) || booking.customerName || 'Unknown User',
            customerEmail: resolvedUser?.email || booking.customerEmail || '-',
            customerPhone: resolvedUser?.phone || resolvedUser?.phoneNumber || booking.customerPhone || '-',
            customerGender: resolvedUser?.gender || booking.customerGender || '-',
            offerName: resolvedOffer?.title || resolvedOffer?.name || booking.offerName || 'Custom Trip',
            destination: resolvedOffer?.location || resolvedOffer?.destination || booking.destination || '-',
            startDate: booking.startDate || booking.start_date || '-',
            endDate: booking.endDate || booking.end_date || '-',
            travelers: booking.travelers || booking.people || 1,
            amount:
              booking.totalAmount !== undefined
                ? `${booking.totalAmount} DZD`
                : booking.total_price !== undefined
                  ? `${booking.total_price} DZD`
                  : booking.amount || '0 DZD',
            status: booking.status || 'pending',
            paymentStatus: booking.paymentStatus || booking.payment_status || (booking.paid ? 'paid' : 'pending'),
            fullUser: resolvedUser,
            offer: resolvedOffer,
          };
        });

        setBookings(mappedBookings);
      } catch (err: any) {
        console.error('Failed to fetch bookings:', err);
        setError('Failed to load bookings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleStatusChange = useCallback(async (bookingId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await bookingService.updateBookingStatus(bookingId, newStatus);
      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: newStatus as Booking['status'] } : b
        )
      );
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) => prev ? { ...prev, status: newStatus as Booking['status'] } : prev);
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [selectedBooking?.id]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        booking.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.offerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, selectedStatus]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    };
  }, [bookings]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  const getPaymentStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <CalendarToday className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">{t.bookings.totalBookings}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <CheckCircle className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
              <p className="text-sm text-gray-500">{t.bookings.confirmed}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <HourglassEmpty className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">{t.bookings.pending}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Cancel className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              <p className="text-sm text-gray-500">{t.bookings.cancelled}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              type="text"
              placeholder={t.bookings.searchBookings}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="all">{t.common.all}</option>
              <option value="confirmed">{t.bookings.confirmed}</option>
              <option value="pending">{t.bookings.pending}</option>
              <option value="cancelled">{t.bookings.cancelled}</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              title="More Filters"
            >
              <FilterList className="text-gray-600" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all font-medium whitespace-nowrap"
            >
              <FileDownload className="text-xl" />
              <span className="hidden sm:inline">Export</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`}>
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.bookingRef}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.customer}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.offer}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.date}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.travelers}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.amount}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.common.status}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.bookings.paymentStatus}</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking, index) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-blue-600">{booking.bookingRef}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold">
                        {booking.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.customerName}</p>
                        <p className="text-sm text-gray-500">{booking.customerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{booking.offerName}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <LocationOn className="text-xs" />
                      {booking.destination}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{booking.startDate}</p>
                    <p className="text-sm text-gray-500">{booking.endDate}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Person className="text-sm" />
                      <span className="font-medium">{booking.travelers}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-900">{booking.amount}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                      disabled={isUpdatingStatus}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 ${getStatusColor(booking.status)}`}
                    >
                      <option value="confirmed">✓ {t.bookings.confirmed}</option>
                      <option value="pending">⏳ {t.bookings.pending}</option>
                      <option value="cancelled">✕ {t.bookings.cancelled}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      title="View Details"
                    >
                      <Visibility className="text-lg" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-xl font-bold">{t.bookings.bookingDetails}</h3>
                  <p className="text-blue-100 text-sm">{selectedBooking.bookingRef}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <Close />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Info */}
                <div className="space-y-6">
                  <div className={`flex items-center gap-3 border-b border-gray-100 pb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AccountCircle className="text-blue-600" />
                    <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs">{t.bookings.customerDetails}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">
                        {selectedBooking.customerName.charAt(0)}
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="font-bold text-lg text-gray-900">{selectedBooking.customerName}</p>
                        <p className="text-gray-500 text-sm">{t.bookings.customer}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pl-2">
                      <div className="flex items-center gap-3 text-gray-600">
                        <EmailIcon className="text-sm" />
                        <span className="text-sm font-medium">{selectedBooking.customerEmail}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone className="text-sm" />
                        <span className="text-sm font-medium">{selectedBooking.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Person className="text-sm" />
                        <span className="text-sm font-medium capitalize">Gender: {selectedBooking.customerGender}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Info */}
                <div className="space-y-6">
                  <div className={`flex items-center gap-3 border-b border-gray-100 pb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CalendarToday className="text-indigo-600" />
                    <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs">{t.bookings.bookingDetails}</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">Package</p>
                      <p className="font-bold text-gray-900">{selectedBooking.offerName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t.bookings.startDate}</p>
                        <p className="font-medium text-gray-900 text-sm">{selectedBooking.startDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t.bookings.endDate}</p>
                        <p className="font-medium text-gray-900 text-sm">{selectedBooking.endDate}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Travelers</p>
                      <p className="font-bold text-gray-900">{selectedBooking.travelers} Persons</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Paid</span>
                        <span className="text-lg font-black text-blue-600">{selectedBooking.amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-6 items-end">
                  {/* Booking Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.bookings.updateStatus}</label>
                    <select
                      value={selectedBooking.status}
                      onChange={(e) => handleStatusChange(selectedBooking.id, e.target.value)}
                      disabled={isUpdatingStatus}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 ${getStatusColor(selectedBooking.status)}`}
                    >
                      <option value="confirmed">✓ {t.bookings.confirmed}</option>
                      <option value="pending">⏳ {t.bookings.pending}</option>
                      <option value="cancelled">✕ {t.bookings.cancelled}</option>
                    </select>
                  </div>
                  {/* Payment Status Badge */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.bookings.paymentStatus}</label>
                    <div className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>
                      Payment: {selectedBooking.paymentStatus}
                    </div>
                  </div>
                  {isUpdatingStatus && (
                    <p className="text-xs text-blue-500 font-medium animate-pulse">Updating status…</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

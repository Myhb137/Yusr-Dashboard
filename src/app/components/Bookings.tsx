import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router';
import { motion } from 'motion/react';
import {
  Search,
  Visibility,
  CheckCircle,
  HourglassEmpty,
  CalendarToday,
  Person,
  LocationOn,
  Phone,
  Email as EmailIcon,
  Close,
  AccountCircle,
  RestartAlt,
} from '@mui/icons-material';

import { useLanguage } from '../context/LanguageContext';
import { useBookings } from '../context/useBookings';
import type { DashboardBooking } from '../context/bookingContextTypes';
import { PaymentReceiptView } from './PaymentReceiptView';
import { BookingWorkflowPanel } from './BookingWorkflowPanel';
import type { WorkflowAction } from '../utils/bookingWorkflow';
import {
  BOOKING_STATUS_QUERY_VALUES,
  PAYMENT_STATUS_QUERY_VALUES,
  DEFAULT_BOOKINGS_LIMIT,
  isValidBookingStatusQuery,
  isValidPaymentStatusQuery,
  type GetBookingsParams,
} from '../utils/bookingQuery';
import { isSuperAdmin } from '../utils/authRole';

const statusLabel = (status: string, tBookings: Record<string, string>) =>
  tBookings[status] || status;

const paymentStatusLabel = (status: string | null, tBookings: Record<string, string>) =>
  status ? tBookings[status] || status : '—';

export function Bookings() {
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const {
    bookings,
    isLoading,
    error,
    userRole,
    refreshBookings,
    applyWorkflowAction,
  } = useBookings();

  const superAdmin = isSuperAdmin(userRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | (typeof BOOKING_STATUS_QUERY_VALUES)[number]>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    'all' | (typeof PAYMENT_STATUS_QUERY_VALUES)[number]
  >('all');

  const buildQueryParams = useCallback((): GetBookingsParams => {
    const params: GetBookingsParams = { limit: DEFAULT_BOOKINGS_LIMIT, offset: 0 };
    if (statusFilter !== 'all' && isValidBookingStatusQuery(statusFilter)) {
      params.status = statusFilter;
    }
    if (paymentStatusFilter !== 'all' && isValidPaymentStatusQuery(paymentStatusFilter)) {
      params.payment_status = paymentStatusFilter;
    }
    return params;
  }, [statusFilter, paymentStatusFilter]);

  useEffect(() => {
    if (location.pathname.includes('/bookings')) {
      refreshBookings(buildQueryParams());
    }
  }, [location.pathname, statusFilter, paymentStatusFilter, refreshBookings, buildQueryParams]);

  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBooking) return;
    const updated = bookings.find((b) => b.id === selectedBooking.id);
    if (updated) setSelectedBooking(updated);
  }, [bookings, selectedBooking?.id]);

  const runWorkflowAction = useCallback(
    async (bookingId: string, action: WorkflowAction) => {
      setIsUpdatingStatus(true);
      setStatusError(null);
      setStatusSuccess(null);
      try {
        await applyWorkflowAction(bookingId, action);
        setStatusSuccess(
          action.type === 'lifecycle'
            ? `status → ${action.nextStatus}`
            : `payment_status → ${action.paymentStatus}`
        );
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Action failed';
        setStatusError(msg);
        console.error('Booking workflow action failed:', err);
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [applyWorkflowAction]
  );

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.bookingRef.toLowerCase().includes(q) ||
        booking.customerName.toLowerCase().includes(q) ||
        booking.offerName.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  const stats = useMemo(
    () => ({
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
    }),
    [bookings]
  );

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'validated':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
      case 'ready_for_agency':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  const getPaymentStatusColor = useCallback((status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'under_review':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  }, []);

  if (isLoading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="bookings-page flex flex-col gap-4 min-w-0 max-w-full w-full">
      <div className="flex flex-col gap-4 w-full max-w-full shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { value: stats.total, label: t.bookings.totalBookings, icon: CalendarToday, gradient: 'from-blue-600 to-indigo-600' },
            { value: stats.confirmed, label: t.bookings.confirmed, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600' },
            { value: stats.pending, label: t.bookings.pending, icon: HourglassEmpty, gradient: 'from-amber-400 to-orange-500' },
            { value: stats.completed, label: t.bookings.completed, icon: CheckCircle, gradient: 'from-indigo-500 to-purple-600' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-3 sm:p-4 shadow-md min-w-0"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                  <card.icon className="text-white text-lg sm:text-xl" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{card.value}</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{card.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-3 sm:p-4 shadow-md">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 relative min-w-0">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={t.bookings.searchBookings}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full min-w-0 py-2.5 text-base sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="flex-1 sm:flex-none min-w-[8rem] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t.common.status}
              >
                <option value="all">{t.common.all} — {t.common.status}</option>
                {BOOKING_STATUS_QUERY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value, t.bookings)}
                  </option>
                ))}
              </select>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as typeof paymentStatusFilter)}
                className="flex-1 sm:flex-none min-w-[8rem] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t.bookings.paymentStatus}
              >
                <option value="all">{t.common.all} — {t.bookings.paymentStatus}</option>
                {PAYMENT_STATUS_QUERY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {paymentStatusLabel(value, t.bookings)}
                  </option>
                ))}
              </select>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => refreshBookings(buildQueryParams())}
                className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100"
                title="Refresh"
              >
                <RestartAlt className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}
      </div>

      <div className="w-full max-w-full min-w-0 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-md">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`}>
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">{t.bookings.bookingRef}</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.bookings.customer}</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-900 hidden sm:table-cell">{t.bookings.offer}</th>
                {superAdmin && (
                  <th className="px-3 py-3 text-xs font-semibold text-gray-900 hidden md:table-cell whitespace-nowrap">
                    Agency
                  </th>
                )}
                <th className="px-3 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">{t.bookings.amount}</th>
                {superAdmin && (
                  <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.bookings.paymentReceipt}</th>
                )}
                <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.common.status}</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.bookings.paymentStatus}</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={superAdmin ? 9 : 7} className="px-4 py-12 text-center text-gray-500 text-sm">
                    {t.bookings.noBookings}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking, index) => (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50/50"
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="font-semibold text-blue-600 text-xs sm:text-sm">{booking.bookingRef}</p>
                    </td>
                    <td className="px-3 py-3 max-w-[10rem] sm:max-w-[14rem]">
                      <p className="font-medium text-gray-900 text-sm truncate">{booking.customerName}</p>
                      <p className="text-xs text-gray-500 truncate">{booking.customerEmail}</p>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell max-w-[12rem]">
                      <p className="font-medium text-gray-900 text-sm truncate">{booking.offerName}</p>
                    </td>
                    {superAdmin && (
                      <td className="px-3 py-3 hidden md:table-cell max-w-[10rem]">
                        <p className="text-sm text-indigo-700 font-medium truncate">{booking.agencyName}</p>
                      </td>
                    )}
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold">{booking.amount}</td>
                    {superAdmin && (
                      <td className="px-3 py-3">
                        <PaymentReceiptView
                          bookingId={booking.id}
                          receiptUrl={booking.receiptUrl}
                          compact
                          superAdminOnly
                          isSuperAdmin={superAdmin}
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] sm:text-xs font-bold border ${getStatusColor(booking.status)}`}
                      >
                        {statusLabel(booking.status, t.bookings)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] sm:text-xs font-bold border ${getPaymentStatusColor(booking.paymentStatus)}`}
                      >
                        {paymentStatusLabel(booking.paymentStatus, t.bookings)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setStatusError(null);
                          setStatusSuccess(null);
                          setIsModalOpen(true);
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        <Visibility className="text-lg" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[min(40rem,calc(100vw-1rem))] max-h-[min(92dvh,100%)] flex flex-col overflow-hidden z-10"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shrink-0">
              <div className={`flex justify-between items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate">{t.bookings.bookingDetails}</h3>
                  <p className="text-blue-100 text-sm">{selectedBooking.bookingRef}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full shrink-0">
                  <Close />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 min-w-0">
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    <AccountCircle className="text-blue-600" />
                    {selectedBooking.customerName}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2 truncate">
                    <EmailIcon fontSize="small" />
                    {selectedBooking.customerEmail}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone fontSize="small" />
                    {selectedBooking.customerPhone}
                  </p>
                </div>
                <div className="space-y-2 min-w-0">
                  <p className="font-bold text-gray-900">{selectedBooking.offerName}</p>
                  {superAdmin && selectedBooking.agencyName && selectedBooking.agencyName !== '-' && (
                    <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-400"></span>
                      {selectedBooking.agencyName}
                    </p>
                  )}
                  <p className="text-gray-500 flex items-center gap-1">
                    <LocationOn fontSize="small" />
                    {selectedBooking.destination}
                  </p>
                  <p className="text-blue-600 font-black text-lg">{selectedBooking.amount}</p>
                  {selectedBooking.depositAmount > 0 && (
                    <p className="text-sm text-gray-600">
                      {t.bookings.depositAmount}:{' '}
                      <span className="font-bold">{selectedBooking.depositAmount} DZD</span>
                    </p>
                  )}
                </div>
              </div>

              {superAdmin && (
                <PaymentReceiptView
                  bookingId={selectedBooking.id}
                  receiptUrl={selectedBooking.depositReceiptUrl || selectedBooking.receiptUrl}
                  superAdminOnly
                  isSuperAdmin={superAdmin}
                />
              )}

              <div className="pt-4 border-t border-gray-100">
                <BookingWorkflowPanel
                  booking={selectedBooking}
                  userRole={userRole}
                  tBookings={t.bookings}
                  isUpdating={isUpdatingStatus}
                  statusError={statusError}
                  statusSuccess={statusSuccess}
                  onAction={(action) => runWorkflowAction(selectedBooking.id, action)}
                  getStatusColor={getStatusColor}
                  getPaymentStatusColor={getPaymentStatusColor}
                  statusLabel={statusLabel}
                  paymentStatusLabel={paymentStatusLabel}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

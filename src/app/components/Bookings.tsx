import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Visibility,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  CalendarToday,
  Person,
  LocationOn,
  Phone,
  Email as EmailIcon,
  Close,
  AccountCircle,
  Payments,
  VerifiedUser,
  RestartAlt,
} from '@mui/icons-material';

import { useLanguage } from '../context/LanguageContext';
import { useBookings } from '../context/BookingContext';
import { Booking, User } from '../types/api';

type BookingStatusFilter = 'all' | 'pending' | 'validated' | 'ready_for_agency' | 'completed' | 'cancelled';
type PaymentStatusFilter = 'all' | 'pending' | 'under_review' | 'paid' | 'failed' | 'refunded';
type BookingStatusValue = 'pending' | 'validated' | 'ready_for_agency' | 'completed' | 'cancelled';

export function Bookings() {
  const { t, isRTL } = useLanguage();
  const { bookings, isLoading, refreshBookings, updateBookingStatus, updatePaymentStatus, validateAttendance, resetToPending } = useBookings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<BookingStatusFilter>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatusFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [depositInput, setDepositInput] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync deposit input when a different booking is opened
  useEffect(() => {
    if (selectedBooking) {
      setDepositInput(selectedBooking.depositAmount > 0 ? String(selectedBooking.depositAmount) : '');
      setValidationError(null);
    }
  }, [selectedBooking?.id]);

  const handleStatusChange = useCallback(async (bookingId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateBookingStatus(bookingId, newStatus);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev: any) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [selectedBooking?.id, updateBookingStatus]);

  const handlePaymentStatusChange = useCallback(async (bookingId: string, newPaymentStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updatePaymentStatus(bookingId, newPaymentStatus);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev: any) => prev ? { ...prev, paymentStatus: newPaymentStatus } : prev);
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [selectedBooking?.id, updatePaymentStatus]);

  const handleValidateAttendance = useCallback(async () => {
    if (!selectedBooking) return;
    const amount = parseFloat(depositInput) || 0;
    setIsValidating(true);
    setValidationError(null);
    try {
      await validateAttendance(selectedBooking.id, amount);
      setSelectedBooking((prev: any) => prev ? { ...prev, status: 'validated', paymentStatus: 'paid', depositAmount: amount } : prev);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to validate attendance.';
      setValidationError(msg);
      console.error('Failed to validate attendance:', err);
    } finally {
      setIsValidating(false);
    }
  }, [selectedBooking, depositInput, validateAttendance]);

  const handleResetToPending = useCallback(async () => {
    if (!selectedBooking) return;
    setIsValidating(true);
    try {
      await resetToPending(selectedBooking.id);
      setSelectedBooking((prev: any) => prev ? { ...prev, status: 'pending', paymentStatus: 'pending', depositAmount: 0 } : prev);
      setDepositInput('');
    } catch (err) {
      console.error('Failed to reset booking:', err);
    } finally {
      setIsValidating(false);
    }
  }, [selectedBooking, resetToPending]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        booking.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.offerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
      const matchesPaymentStatus = selectedPaymentStatus === 'all' || booking.paymentStatus === selectedPaymentStatus;
      return matchesSearch && matchesStatus && matchesPaymentStatus;
    });
  }, [bookings, searchQuery, selectedStatus, selectedPaymentStatus]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed' || b.status === 'validated').length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    };
  }, [bookings]);

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

  const getPaymentStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  const getAllowedNextStatuses = useCallback((currentStatus: BookingStatusValue): BookingStatusValue[] => {
    // Backend-enforced flow from API error:
    // pending -> validated -> ready_for_agency -> completed, with cancellation allowed before completion.
    switch (currentStatus) {
      case 'pending':
        return ['pending', 'validated', 'cancelled'];
      case 'validated':
        return ['validated', 'ready_for_agency', 'cancelled'];
      case 'ready_for_agency':
        return ['ready_for_agency', 'completed', 'cancelled'];
      case 'completed':
        return ['completed'];
      case 'cancelled':
        return ['cancelled'];
      default:
        return ['pending'];
    }
  }, []);

  if (isLoading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all text-sm"
            >
              <option value="all">Booking: {t.common.all}</option>
              <option value="pending">{t.bookings.pending}</option>
              <option value="validated">{t.bookings.validated || 'validated'}</option>
              <option value="ready_for_agency">{t.bookings.ready_for_agency}</option>
              <option value="completed">{t.bookings.completed}</option>
              <option value="cancelled">{t.bookings.cancelled}</option>
            </select>

            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all text-sm"
            >
              <option value="all">Payment: {t.common.all}</option>
              <option value="pending">{t.bookings.pending}</option>
              <option value="under_review">{t.bookings.under_review}</option>
              <option value="paid">{t.bookings.paid}</option>
              <option value="failed">{t.bookings.failed}</option>
              <option value="refunded">{t.bookings.refunded}</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refreshBookings}
              className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              title="Refresh Bookings"
            >
              <RestartAlt className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
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
                    {(() => {
                      const StatusIcon = (
                        booking.status === 'confirmed' ||
                        booking.status === 'validated' ||
                        booking.status === 'completed'
                      ) ? CheckCircle : booking.status === 'cancelled' ? Cancel : HourglassEmpty;
                      return (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                          <StatusIcon className="text-sm" />
                          <span className="uppercase tracking-wider">{t.bookings[booking.status as keyof typeof t.bookings] || booking.status}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      <span className="uppercase tracking-wider">{t.bookings[booking.paymentStatus as keyof typeof t.bookings] || booking.paymentStatus}</span>
                    </div>
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
                        <span className="text-sm font-medium capitalize">{t.bookings.gender}: {selectedBooking.customerGender}</span>
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
                        <span className="text-sm font-medium text-gray-600">Total Trip Price</span>
                        <span className="text-lg font-black text-blue-600">{selectedBooking.amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">{t.bookings.managementActions}</h4>
                <div className="flex flex-wrap gap-6 items-end">
                  {/* Booking Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.bookings.updateStatus}</label>
                    <select
                      value={selectedBooking.status}
                      onChange={(e) => handleStatusChange(selectedBooking.id, e.target.value)}
                      disabled={isUpdatingStatus || isValidating || selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled'}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${getStatusColor(selectedBooking.status)}`}
                    >
                      {getAllowedNextStatuses(selectedBooking.status as BookingStatusValue).map((status) => (
                        <option key={status} value={status}>
                          {status === 'pending' ? '⏳' :
                           status === 'validated' ? '✓' :
                           status === 'ready_for_agency' ? '🏢' :
                           status === 'completed' ? '✅' :
                           status === 'cancelled' ? '✕' :
                           '•'}{' '}
                          {t.bookings[status as keyof typeof t.bookings] || status}
                        </option>
                      ))}
                    </select>
                    {selectedBooking.status === 'validated' && (
                      <p className="text-[10px] text-amber-600 font-medium">↓ Use panel below to change</p>
                    )}
                  </div>
                  {/* Payment Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.bookings.paymentStatus}</label>
                    <select
                      value={selectedBooking.paymentStatus}
                      onChange={(e) => handlePaymentStatusChange(selectedBooking.id, e.target.value)}
                      disabled={isUpdatingStatus || isValidating}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}
                    >
                      <option value="pending">{t.bookings.pending}</option>
                      <option value="under_review">{t.bookings.under_review}</option>
                      <option value="paid">{t.bookings.paid}</option>
                      <option value="failed">{t.bookings.failed}</option>
                      <option value="refunded">{t.bookings.refunded}</option>
                    </select>
                  </div>
                  {isUpdatingStatus && (
                    <p className="text-xs text-blue-500 font-medium animate-pulse">Updating status…</p>
                  )}
                </div>
              </div>

              {/* ── Booking Fee & Attendance Validation ── */}
              <div className="mt-6">
                <div className={`rounded-2xl border-2 overflow-hidden ${
                  selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid'
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : 'border-amber-200 bg-amber-50/60'
                }`}>
                  {/* Panel header */}
                  <div className={`flex items-center gap-3 px-5 py-3 ${
                    selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid'
                      ? 'bg-emerald-100/70'
                      : 'bg-amber-100/70'
                  }`}>
                    <Payments className={`text-xl ${
                      selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid'
                        ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${
                        selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid'
                          ? 'text-emerald-800' : 'text-amber-800'
                      }`}>{t.bookings.bookingFeeTitle}</p>
                      <p className={`text-xs mt-0.5 ${
                        selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid'
                          ? 'text-emerald-600' : 'text-amber-600'
                      }`}>{t.bookings.bookingFeeDesc}</p>
                    </div>
                    {/* Fee Status Badge */}
                    {selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid' ? (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold whitespace-nowrap">
                        <VerifiedUser className="text-sm" />
                        {t.bookings.feePaid}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-200 text-amber-800 text-xs font-bold whitespace-nowrap">
                        <HourglassEmpty className="text-sm" />
                        {t.bookings.feeAwaitingPayment}
                      </span>
                    )}
                  </div>

                  {/* Panel body */}
                  <div className="px-5 py-4 space-y-4">
                    {/* Deposit amount row */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          {t.bookings.depositAmount}
                        </label>
                        <div className="relative">
                          <input
                            id={`deposit-${selectedBooking.id}`}
                            type="number"
                            min="0"
                            step="100"
                            placeholder={t.bookings.depositPlaceholder}
                            value={depositInput}
                            onChange={(e) => { setDepositInput(e.target.value); setValidationError(null); }}
                            disabled={isValidating}
                            className="w-full pl-4 pr-16 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all disabled:opacity-60"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">DZD</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleValidateAttendance}
                        disabled={isValidating || (selectedBooking.status === 'validated' && selectedBooking.paymentStatus === 'paid')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/30 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <VerifiedUser className="text-base" />
                        {isValidating ? t.bookings.validating : t.bookings.validateAttendance}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleResetToPending}
                        disabled={isValidating || (selectedBooking.status === 'pending' && selectedBooking.paymentStatus === 'pending')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <RestartAlt className="text-base" />
                        {t.bookings.resetToPending}
                      </motion.button>
                    </div>

                    {/* Backend validation error */}
                    {validationError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"
                      >
                        <span className="text-red-500 text-base mt-0.5">⚠</span>
                        <p className="text-sm text-red-700 font-medium">{validationError}</p>
                      </motion.div>
                    )}

                    {/* Last recorded fee */}
                    {selectedBooking.depositAmount > 0 && (
                      <p className="text-xs text-gray-500">
                        Last recorded fee:{' '}
                        <span className="font-bold text-gray-700">
                          {selectedBooking.depositAmount.toLocaleString()} DZD
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

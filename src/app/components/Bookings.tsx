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
  RestartAlt,
} from '@mui/icons-material';

import { useLanguage } from '../context/LanguageContext';
import { useBookings, DashboardBooking } from '../context/BookingContext';
import { PaymentReceiptView } from './PaymentReceiptView';
import {
  getAllowedActions,
  getStatusLabelKey,
  STATUS_FLOW_LABEL,
  STATUS_NOT_ALLOWED_ERROR,
  calculateDepositAmount,
  BookingStatus,
  toBookingStatus,
  type StatusAction,
} from '../utils/bookingStatus';
import { isSuperAdmin } from '../utils/authRole';

const statusLabel = (status: string, tBookings: Record<string, string>) =>
  tBookings[getStatusLabelKey(status)] || status;

type BookingStatusFilter = 'all' | BookingStatus;

function actionLabel(action: StatusAction, tBookings: Record<string, string>): string {
  switch (action.type) {
    case 'confirm':
      return tBookings.markConfirmed;
    case 'set_deposit':
      return tBookings.setDeposit;
    case 'validate_receipt':
      return tBookings.validateReceipt;
    case 'release_to_agency':
      return `→ ${tBookings.ready_for_agency}`;
    case 'complete':
      return `→ ${tBookings.completed}`;
    default:
      return '';
  }
}

export function Bookings() {
  const { t, isRTL } = useLanguage();
  const {
    bookings,
    isLoading,
    error,
    userRole,
    refreshBookings,
    updateBookingStatus,
    validateReceipt,
    saveDepositAmount,
  } = useBookings();

  const superAdmin = isSuperAdmin(userRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<BookingStatusFilter | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [depositInput, setDepositInput] = useState('');

  useEffect(() => {
    if (!selectedBooking) return;
    const updated = bookings.find((b) => b.id === selectedBooking.id);
    if (updated) {
      setSelectedBooking(updated);
      const suggested =
        updated.depositAmount > 0
          ? updated.depositAmount
          : calculateDepositAmount(updated.totalPrice);
      setDepositInput(String(suggested));
    }
  }, [bookings, selectedBooking?.id]);

  const runAction = useCallback(
    async (bookingId: string, action: StatusAction) => {
      setIsUpdatingStatus(true);
      setStatusError(null);
      setStatusSuccess(null);
      try {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');

        const deposit = parseFloat(depositInput) || booking.depositAmount;

        switch (action.type) {
          case 'confirm':
            await updateBookingStatus(bookingId, BookingStatus.Confirmed);
            break;
          case 'set_deposit': {
            const mode = await saveDepositAmount(bookingId, deposit);
            setStatusSuccess(
              mode === 'api' ? t.bookings.depositSavedApi : t.bookings.depositSavedLocal
            );
            break;
          }
          case 'validate_receipt':
            await validateReceipt(bookingId, deposit);
            break;
          case 'release_to_agency':
            await updateBookingStatus(bookingId, BookingStatus.ReadyForAgency, {
              depositAmount: deposit,
            });
            break;
          case 'complete':
            await updateBookingStatus(bookingId, BookingStatus.Completed);
            break;
        }
        if (action.type === 'set_deposit') {
          const booking = bookings.find((b) => b.id === bookingId);
          if (booking && booking.apiStatus === 'pending') {
            await refreshBookings();
          }
        } else {
          await refreshBookings();
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to update status';
        setStatusError(
          String(msg).includes('bookings_status_check') ? STATUS_NOT_ALLOWED_ERROR : msg
        );
        console.error('Booking status action failed:', err);
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [bookings, depositInput, updateBookingStatus, validateReceipt, saveDepositAmount, refreshBookings]
  );

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

  const stats = useMemo(
    () => ({
      total: bookings.length,
      confirmed: bookings.filter(
        (b) =>
          b.status === BookingStatus.Confirmed ||
          b.status === BookingStatus.ReadyForAgency ||
          b.status === BookingStatus.Completed
      ).length,
      pending: bookings.filter((b) => b.status === BookingStatus.Pending).length,
      completed: bookings.filter((b) => b.status === BookingStatus.Completed).length,
    }),
    [bookings]
  );

  const getStatusColor = useCallback((status: string) => {
    switch (toBookingStatus(status)) {
      case BookingStatus.Confirmed:
      case BookingStatus.Completed:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case BookingStatus.Pending:
      case BookingStatus.ReadyForAgency:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  const modalActions = selectedBooking
    ? getAllowedActions(userRole, {
        status: selectedBooking.status,
        apiStatus: selectedBooking.apiStatus,
        paymentStatus: selectedBooking.paymentStatus,
        depositAmount: selectedBooking.depositAmount,
        receiptUrl: selectedBooking.receiptUrl,
        receiptValidated: selectedBooking.receiptValidated,
      })
    : [];

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
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as BookingStatusFilter | 'all')}
                className="flex-1 sm:flex-none min-w-[8rem] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t.common.all}</option>
                <option value={BookingStatus.Pending}>{t.bookings.pending}</option>
                <option value={BookingStatus.Confirmed}>{t.bookings.confirmed}</option>
                <option value={BookingStatus.ReadyForAgency}>{t.bookings.ready_for_agency}</option>
                <option value={BookingStatus.Completed}>{t.bookings.completed}</option>
              </select>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={refreshBookings}
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
                <th className="px-3 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">{t.bookings.amount}</th>
                {superAdmin && (
                  <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.bookings.paymentReceipt}</th>
                )}
                <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.common.status}</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-900">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={superAdmin ? 7 : 6} className="px-4 py-12 text-center text-gray-500 text-sm">
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
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold">{booking.amount}</td>
                    {superAdmin && (
                      <td className="px-3 py-3">
                        <PaymentReceiptView
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
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setStatusError(null);
                          setDepositInput(
                            String(
                              booking.depositAmount > 0
                                ? booking.depositAmount
                                : calculateDepositAmount(booking.totalPrice)
                            )
                          );
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

              <PaymentReceiptView
                receiptUrl={selectedBooking.receiptUrl}
                superAdminOnly
                isSuperAdmin={superAdmin}
              />

              {superAdmin &&
                toBookingStatus(selectedBooking.status) === BookingStatus.Confirmed && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                    <label className="block text-xs font-bold text-gray-600 uppercase">
                      {t.bookings.depositAmount}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={depositInput}
                      onChange={(e) => setDepositInput(e.target.value)}
                      placeholder={t.bookings.depositPlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                    <p className="text-xs text-gray-500">{t.bookings.depositHint}</p>
                    {selectedBooking.receiptValidated && (
                      <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle fontSize="small" />
                        {t.bookings.receiptValidated}
                      </p>
                    )}
                  </div>
                )}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {t.bookings.updateStatus}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">{t.common.status}:</span>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedBooking.status)}`}
                  >
                    {statusLabel(selectedBooking.status, t.bookings)}
                  </span>
                </div>

                {modalActions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {modalActions.map((action) => (
                      <motion.button
                        key={action.type}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        disabled={isUpdatingStatus}
                        onClick={() => runAction(selectedBooking.id, action)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${
                          action.type === 'validate_receipt'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : getStatusColor(
                                action.type === 'confirm'
                                  ? BookingStatus.Confirmed
                                  : action.type === 'release_to_agency'
                                    ? BookingStatus.ReadyForAgency
                                    : action.type === 'complete'
                                      ? BookingStatus.Completed
                                      : selectedBooking.status
                              )
                        }`}
                      >
                        {actionLabel(action, t.bookings)}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t.bookings.noStatusActions}</p>
                )}

                <p className="text-[0.65rem] text-gray-400 mt-2">{STATUS_FLOW_LABEL}</p>
                {isUpdatingStatus && (
                  <p className="text-xs text-blue-500 mt-2 animate-pulse">{t.common.loading}</p>
                )}
                {statusSuccess && (
                  <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    {statusSuccess}
                  </p>
                )}
                {statusError && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {statusError}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

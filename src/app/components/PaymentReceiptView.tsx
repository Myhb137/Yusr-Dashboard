import { useState } from 'react';
import { ImageNotSupported, Lock, Refresh } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';
import { useDepositReceipt } from '../hooks/useDepositReceipt';

interface PaymentReceiptViewProps {
  bookingId?: string | null;
  /** From GET /bookings — deposit_receipt_url / receipt_url */
  receiptUrl?: string | null;
  compact?: boolean;
  className?: string;
  superAdminOnly?: boolean;
  isSuperAdmin?: boolean;
}

export function PaymentReceiptView({
  bookingId,
  receiptUrl,
  compact = false,
  className = '',
  superAdminOnly = false,
  isSuperAdmin = true,
}: PaymentReceiptViewProps) {
  const { t, isRTL } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { src, isLoading, error, reload } = useDepositReceipt({
    bookingId,
    fallbackUrl: receiptUrl,
    enabled: true,
  });

  if (superAdminOnly && !isSuperAdmin) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-gray-400 ${className}`}
        title={t.bookings.receiptRestricted}
      >
        <Lock className="!text-sm" />
        {!compact && <span>{t.bookings.receiptRestricted}</span>}
      </span>
    );
  }

  const hasReceipt = Boolean(src?.trim());

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs ${compact ? 'w-12 h-12 sm:w-14 sm:h-14' : 'min-h-[8rem] w-full'} ${className}`}
      >
        <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !hasReceipt) {
    return (
      <div className={`text-xs text-red-600 space-y-2 ${className}`}>
        <p>{t.bookings.receiptLoadError}</p>
        <button
          type="button"
          onClick={() => reload()}
          className="inline-flex items-center gap-1 text-blue-600 font-semibold"
        >
          <Refresh fontSize="inherit" />
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (compact) {
    if (!hasReceipt) {
      return (
        <span
          className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-300 ${className}`}
          title={t.bookings.noReceipt}
        >
          <ImageNotSupported className="!text-xl" />
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={`block rounded-xl border border-gray-200 overflow-hidden bg-gray-50 hover:ring-2 hover:ring-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
        title={t.bookings.receiptTapToZoom}
      >
        <img src={src!} alt={t.bookings.paymentReceipt} className="w-12 h-12 sm:w-14 sm:h-14 object-cover" />
      </button>
    );
  }

  return (
    <div className={`min-w-0 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {t.bookings.paymentReceipt}
        </p>
        <button
          type="button"
          onClick={() => reload()}
          className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1 hover:underline"
        >
          <Refresh sx={{ fontSize: 14 }} />
          {t.common.refresh}
        </button>
      </div>

      {hasReceipt ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-full rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img
            src={src!}
            alt={t.bookings.paymentReceipt}
            className="w-full max-h-[min(20rem,50vh)] object-contain object-center mx-auto"
          />
        </button>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/80 min-h-[10rem] sm:min-h-[12rem] gap-2">
          <ImageNotSupported className="text-gray-300 !text-5xl" />
          <p className="text-sm text-gray-500">{t.bookings.noReceipt}</p>
        </div>
      )}

      {lightboxOpen && hasReceipt && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/85"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-3 end-3 sm:top-5 sm:end-5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            {t.common.cancel}
          </button>
          <img
            src={src!}
            alt={t.bookings.paymentReceipt}
            className="max-w-[min(100%,56rem)] max-h-[min(90dvh,48rem)] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

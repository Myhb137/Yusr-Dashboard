import { useState } from 'react';
import { ImageNotSupported, Lock } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';

interface PaymentReceiptViewProps {
  receiptUrl?: string | null;
  compact?: boolean;
  className?: string;
  /** Receipt is only visible to super admin */
  superAdminOnly?: boolean;
  isSuperAdmin?: boolean;
}

export function PaymentReceiptView({
  receiptUrl,
  compact = false,
  className = '',
  superAdminOnly = false,
  isSuperAdmin = true,
}: PaymentReceiptViewProps) {
  const { t, isRTL } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  const hasReceipt = Boolean(receiptUrl?.trim());

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
        <img
          src={receiptUrl!}
          alt={t.bookings.paymentReceipt}
          className="w-12 h-12 sm:w-14 sm:h-14 object-cover"
        />
      </button>
    );
  }

  return (
    <div className={`min-w-0 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        {t.bookings.paymentReceipt}
      </p>
      {hasReceipt ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-full rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img
            src={receiptUrl!}
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
            src={receiptUrl!}
            alt={t.bookings.paymentReceipt}
            className="max-w-[min(100%,56rem)] max-h-[min(90dvh,48rem)] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

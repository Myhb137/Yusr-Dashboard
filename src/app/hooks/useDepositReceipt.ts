import { useCallback, useEffect, useState } from 'react';

interface UseDepositReceiptOptions {
  bookingId?: string | null;
  /** URL from GET /bookings (deposit_receipt_url / receipt_url) */
  fallbackUrl?: string | null;
  enabled?: boolean;
}

/**
 * Display deposit receipt from booking list data (GET /bookings).
 * POST /deposit-receipt is upload-only — there is no GET for this resource.
 */
export function useDepositReceipt({
  bookingId,
  fallbackUrl,
  enabled = true,
}: UseDepositReceiptOptions) {
  const [src, setSrc] = useState<string | null>(fallbackUrl?.trim() || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!enabled) {
      setSrc(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setError(null);
    setSrc(fallbackUrl?.trim() || null);
  }, [enabled, fallbackUrl]);

  useEffect(() => {
    load();
  }, [load, bookingId]);

  return { src, isLoading, error, reload: load };
}

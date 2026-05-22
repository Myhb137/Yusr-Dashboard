const AUDIT_KEY = 'buraq_booking_status_audit';
const MAX_ENTRIES = 500;

export interface BookingStatusAuditEntry {
  id: string;
  bookingId: string;
  fromStatus: string;
  toStatus: string;
  actorRole: string;
  actorId?: string;
  paymentStatus?: string;
  depositAmount?: number;
  receiptValidated?: boolean;
  timestamp: string;
}

function load(): BookingStatusAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: BookingStatusAuditEntry[]) {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function logBookingStatusChange(
  entry: Omit<BookingStatusAuditEntry, 'id' | 'timestamp'>
): BookingStatusAuditEntry {
  const full: BookingStatusAuditEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  const entries = load();
  entries.push(full);
  save(entries);
  return full;
}

export function getBookingStatusAuditLog(bookingId?: string): BookingStatusAuditEntry[] {
  const entries = load();
  if (!bookingId) return [...entries].reverse();
  return entries.filter((e) => e.bookingId === bookingId).reverse();
}

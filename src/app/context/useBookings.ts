import { useContext } from 'react';
import { BookingContext } from './bookingContextStore';
import type { BookingContextValue } from './bookingContextTypes';

export function useBookings(): BookingContextValue {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
}

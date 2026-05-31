import { createContext } from 'react';
import type { BookingContextValue } from './bookingContextTypes';

/** Single context instance (avoids duplicate modules on Vite HMR / Windows paths). */
export const BookingContext = createContext<BookingContextValue | undefined>(undefined);

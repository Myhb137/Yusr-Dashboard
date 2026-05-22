/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base
  readonly VITE_API_BASE_URL: string;

  // Health
  readonly VITE_API_HEALTH?: string;

  // Auth
  readonly VITE_API_AUTH_ENDPOINT?: string;
  readonly VITE_API_AUTH_SIGNUP?: string;
  readonly VITE_API_AUTH_LOGIN?: string;
  readonly VITE_API_AUTH_VERIFY_ADMIN_2FA?: string;
  readonly VITE_API_AUTH_VERIFY_ADMIN_OTP?: string;
  readonly VITE_API_AUTH_USER?: string;
  readonly VITE_API_AUTH_USER_PASSWORD?: string;
  readonly VITE_API_AUTH_LOGOUT?: string;
  readonly VITE_API_AUTH_FORGOT_PASSWORD?: string;
  readonly VITE_API_AUTH_RESET_PASSWORD?: string;
  readonly VITE_API_AUTH_FCM_TOKEN?: string;

  // Offers
  readonly VITE_API_OFFERS_ENDPOINT?: string;

  // Bookings
  readonly VITE_API_BOOKINGS_ENDPOINT?: string;

  // Admin
  readonly VITE_API_ADMIN_ENDPOINT?: string;
  readonly VITE_API_ADMIN_USERS?: string;
  readonly VITE_API_ADMIN_ADMINS?: string;
  readonly VITE_API_ANALYTICS_ENDPOINT?: string;
  readonly VITE_API_ADMIN_NOTIFICATIONS_BROADCAST?: string;

  // Notifications
  readonly VITE_API_NOTIFICATIONS?: string;

  // Legacy / misc
  readonly VITE_API_TOKEN?: string;

  // Firebase
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

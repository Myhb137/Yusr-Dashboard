/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_OFFERS_ENDPOINT?: string;
  readonly VITE_API_BOOKINGS_ENDPOINT?: string;
  readonly VITE_API_ANALYTICS_ENDPOINT?: string;
  readonly VITE_API_AUTH_ENDPOINT?: string;
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

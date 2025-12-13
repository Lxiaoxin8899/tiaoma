/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_OFFLINE?: string
  readonly VITE_ENABLE_IP_LOGGING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

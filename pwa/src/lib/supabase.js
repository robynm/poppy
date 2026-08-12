import { createClient } from "@supabase/supabase-js";

// Cloud sync is opt-in via build-time env vars. With neither set, `supabase` is
// null and every cloudSync call no-ops — the app behaves exactly as a pure
// local-first PWA (and the test suite / un-configured builds stay green).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabase = cloudEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true, // session lives in localStorage → survives IDB wipes
        autoRefreshToken: true,
      },
    })
  : null;

export { supabase, cloudEnabled };

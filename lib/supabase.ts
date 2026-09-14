import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// `url`/`anonKey` are undefined until you create a Supabase project and add
// them to .env.local (see README.md). We don't throw here so the rest of the
// app still builds and runs before that step is done — only the join form
// needs this client, and it reports a clear error if it's missing.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(supabase);

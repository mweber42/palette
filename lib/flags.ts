import { createClient } from "./supabase/server";

// Feature flags (ADR-007): the source of truth is the `feature_flags` table,
// so Marine can switch a feature on or off from the admin without a deploy.
// The database itself also checks the relevant flag on every write, so a
// flag that is off really closes the feature — this helper only decides
// what the UI shows.

export type FlagKey =
  | "artist_accounts"
  | "member_accounts"
  | "spaces"
  | "likes"
  | "share"
  | "collections"
  | "presale_intents"
  | "journal"
  | "founding_member_badge"
  | "demo_content"
  | "organization_accounts"
  | "opportunities"
  | "contact_requests"
  | "reco_embeddings"
  | "messaging"
  | "print_sales"
  | "paid_plans";

export type Flags = Record<FlagKey, boolean>;

// Used when Supabase isn't configured (local dev without env vars, preview
// deploys) — mirrors the launch state seeded by 010_v2_seed.sql.
export const DEFAULT_FLAGS: Flags = {
  artist_accounts: true,
  member_accounts: true,
  spaces: true,
  likes: true,
  share: true,
  collections: true,
  presale_intents: true,
  journal: true,
  founding_member_badge: true,
  demo_content: true,
  organization_accounts: false,
  opportunities: false,
  contact_requests: false,
  reco_embeddings: false,
  messaging: false,
  print_sales: false,
  paid_plans: false,
};

export async function getFlags(): Promise<Flags> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return DEFAULT_FLAGS;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("feature_flags").select("key, enabled");
    if (error || !data) return DEFAULT_FLAGS;
    const flags = { ...DEFAULT_FLAGS };
    for (const row of data as { key: string; enabled: boolean }[]) {
      if (row.key in flags) flags[row.key as FlagKey] = row.enabled;
    }
    return flags;
  } catch {
    return DEFAULT_FLAGS;
  }
}

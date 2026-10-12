export type Lang = "en" | "fr";

export interface Artist {
  id: string;
  slug: string;
  name: string;
  location: string;
  medium: string; // key into CATS
  bio: { en: string; fr: string };
}

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  category: string; // key into CATS
  artistId: string;
  /** Demo data only — prices are not shown anywhere (no sales, ADR-001). */
  price: string;
  dimensions: string;
  medium: string; // key into MEDIUMS
}

// ---------------------------------------------------------------------------
// v2 database rows (supabase/005-010). Spec: claude/palette-v2-architecture-spec.md
// ---------------------------------------------------------------------------

export type AccountType = "artist" | "space" | "organization" | "member";
/** Account types that can sign up today (organization opens later, by flag). */
export type SignupAccountType = "artist" | "space" | "member";

export interface Profile {
  id: string;
  account_type: AccountType;
  handle: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lang: Lang;
  avatar_path: string | null;
  links: { website?: string; instagram?: string } & Record<string, string | undefined>;
  is_published: boolean;
  first_published_at: string | null;
  founding_member: boolean;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileModeration {
  profile_id: string;
  status: "active" | "suspended";
  seen_by_admin_at: string | null;
  moderator_note: string | null;
}

export interface ArtistDetails {
  profile_id: string;
  open_to_commissions: boolean;
  collaboration_types: string[];
  languages: string[];
}

export interface ArtistPrivate {
  profile_id: string;
  rate_range: string | null;
  print_consent: boolean;
}

export interface SpaceDetails {
  profile_id: string;
  space_type: string | null;
  address_public: string | null;
  hanging_surface_m2: number | null;
  exhibition_frequency: string | null;
  audiences: string[];
  artist_terms: string | null;
}

export interface MemberPrivate {
  profile_id: string;
  onboarding_done: boolean;
  newsletter_consent: boolean;
  presale_notify_consent: boolean;
}

export type TagKind = "technique" | "style";

export interface Tag {
  id: string;
  kind: TagKind;
  slug: string;
  label_en: string;
  label_fr: string;
  status: "active" | "proposed" | "merged";
  proposed_by: string | null;
}

export interface ArtworkRow {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  year: number | null;
  width_cm: number | null;
  height_cm: number | null;
  image_path: string;
  original_available: boolean;
  hd_file_available: boolean;
  presale_enabled: boolean;
  review_status: "live" | "hidden";
  created_at: string;
}

/** An artwork with its tag ids, as loaded for the owner's dashboard. */
export interface ArtworkWithTags extends ArtworkRow {
  tag_ids: string[];
}

export interface NotificationPreferences {
  profile_id: string;
  email: boolean;
  sms: boolean;
  phone: string | null;
}

export interface AppNotification {
  id: string;
  kind: "presale_available" | "welcome" | "system";
  artwork_id: string | null;
  title_en: string;
  title_fr: string;
  body_en: string | null;
  body_fr: string | null;
  read_at: string | null;
  created_at: string;
}

/** An artwork in the user's "En vue" list (active purchase intent). */
export interface WatchItem {
  intent_id: string;
  artwork_id: string;
  title: string;
  image_path: string;
  artist_name: string;
  created_at: string;
}

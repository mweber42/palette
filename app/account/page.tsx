import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountView, { type AccountData } from "@/components/AccountView";
import type {
  AppNotification,
  NotificationPreferences,
  WatchItem,
  ArtistDetails,
  ArtistPrivate,
  ArtworkRow,
  ArtworkWithTags,
  MemberPrivate,
  Profile,
  ProfileModeration,
  SpaceDetails,
  Tag,
} from "@/lib/types";

// Server Component: auth check + every read for the dashboard. Rendering
// (bilingual, interactive) happens in AccountView, a Client Component.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login");

  const data: AccountData = {
    profile,
    moderation: null,
    artworks: [],
    tags: [],
    stats: {},
    watchlist: [],
    notifications: [],
    notificationPrefs: null,
  };

  // Every account type: "En vue" list, notifications and their settings.
  const [intents, notifications, prefs] = await Promise.all([
    supabase
      .from("purchase_intents")
      .select("id, artwork_id, created_at, artworks(title, image_path, profiles(display_name))")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("notification_preferences").select("*").eq("profile_id", user.id).maybeSingle<NotificationPreferences>(),
  ]);
  type IntentRow = {
    id: string;
    artwork_id: string;
    created_at: string;
    artworks: { title: string; image_path: string; profiles: { display_name: string } | null } | null;
  };
  data.watchlist = ((intents.data ?? []) as unknown as IntentRow[])
    // An artwork that is no longer visible (artist suspended, work deleted)
    // simply drops out of the list.
    .filter((r) => r.artworks)
    .map(
      (r): WatchItem => ({
        intent_id: r.id,
        artwork_id: r.artwork_id,
        title: r.artworks!.title,
        image_path: r.artworks!.image_path,
        artist_name: r.artworks!.profiles?.display_name ?? "",
        created_at: r.created_at,
      })
    );
  data.notifications = (notifications.data ?? []) as AppNotification[];
  data.notificationPrefs = prefs.data;

  if (profile.account_type !== "member") {
    const { data: moderation } = await supabase
      .from("profile_moderation")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle<ProfileModeration>();
    data.moderation = moderation;
  }

  if (profile.account_type === "artist") {
    const [details, priv, artworks, tags, stats] = await Promise.all([
      supabase.from("artist_details").select("*").eq("profile_id", user.id).maybeSingle<ArtistDetails>(),
      supabase.from("artist_private").select("*").eq("profile_id", user.id).maybeSingle<ArtistPrivate>(),
      supabase
        .from("artworks")
        .select("*, artwork_tags(tag_id)")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("tags").select("id, kind, slug, label_en, label_fr, status, proposed_by").order("label_en"),
      supabase.rpc("my_artwork_stats"),
    ]);
    data.artistDetails = details.data;
    data.artistPrivate = priv.data;
    data.artworks = ((artworks.data ?? []) as (ArtworkRow & { artwork_tags: { tag_id: string }[] })[]).map(
      ({ artwork_tags, ...a }) => ({ ...a, tag_ids: artwork_tags.map((x) => x.tag_id) }) as ArtworkWithTags
    );
    // Usable tags: the shared list + this artist's own suggestions.
    data.tags = ((tags.data ?? []) as Tag[]).filter(
      (t) => t.status === "active" || (t.status === "proposed" && t.proposed_by === user.id)
    );
    for (const s of (stats.data ?? []) as { artwork_id: string; likes: number; active_intents: number }[]) {
      data.stats[s.artwork_id] = { likes: s.likes, wishes: s.active_intents };
    }
  } else if (profile.account_type === "space") {
    const { data: details } = await supabase
      .from("space_details")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle<SpaceDetails>();
    data.spaceDetails = details;
  } else if (profile.account_type === "member") {
    const { data: priv } = await supabase
      .from("member_private")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle<MemberPrivate>();
    data.memberPrivate = priv;
  }

  return <AccountView data={data} imageBaseUrl={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artworks/`} />;
}

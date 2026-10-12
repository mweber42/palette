"use client";

import { useLang } from "@/components/LangProvider";
import ProfileForm from "@/components/ProfileForm";
import ArtworkManager from "@/components/ArtworkManager";
import { Notifications, WatchList } from "@/components/WatchAndNotifications";
import { signOut } from "@/lib/auth-actions";
import { mono } from "@/lib/ui";
import type {
  AppNotification,
  NotificationPreferences,
  WatchItem,
  ArtistDetails,
  ArtistPrivate,
  ArtworkWithTags,
  MemberPrivate,
  Profile,
  ProfileModeration,
  SpaceDetails,
  Tag,
} from "@/lib/types";

export interface AccountData {
  profile: Profile;
  moderation: ProfileModeration | null;
  artistDetails?: ArtistDetails | null;
  artistPrivate?: ArtistPrivate | null;
  spaceDetails?: SpaceDetails | null;
  memberPrivate?: MemberPrivate | null;
  artworks: ArtworkWithTags[];
  tags: Tag[];
  stats: Record<string, { likes: number; wishes: number }>;
  watchlist: WatchItem[];
  notifications: AppNotification[];
  notificationPrefs: NotificationPreferences | null;
}

/**
 * Dashboard. Data is fetched server-side in app/account/page.tsx (cookie
 * auth can't run in a client component); this client component does the
 * bilingual, interactive rendering.
 */
export default function AccountView({ data, imageBaseUrl }: { data: AccountData; imageBaseUrl: string }) {
  const { t } = useLang();
  const { profile, moderation } = data;

  const typeLabel = {
    artist: t.joinArtistTitle,
    space: t.joinSpaceTitle,
    organization: t.joinOrgTitle,
    member: t.joinMemberTitle,
  }[profile.account_type];

  // Mirror of private.compute_is_published (005_v2_core.sql), only to tell
  // the user what's missing. The database stays the source of truth.
  const missing: string[] = [];
  if (!profile.display_name.trim()) missing.push(t.missingName);
  if (profile.account_type === "artist") {
    const live = data.artworks.filter((a) => a.review_status === "live");
    if (live.length < 3) missing.push(t.missingWorks);
    const techniqueIds = new Set(data.tags.filter((tg) => tg.kind === "technique").map((tg) => tg.id));
    if (!live.some((a) => a.tag_ids.some((id) => techniqueIds.has(id)))) missing.push(t.missingTechnique);
  }
  if (profile.account_type === "space") {
    if (!data.spaceDetails?.space_type) missing.push(t.missingSpaceType);
    if (!profile.city?.trim()) missing.push(t.missingCity);
  }

  const suspended = moderation?.status === "suspended";

  return (
    <div className="max-w-[1080px] mx-auto px-5 sm:px-9 pt-[120px] md:pt-[160px] pb-24">
      <div className="flex items-center justify-between gap-4">
        <div className={mono + " text-mid"}>
          {t.accountEyebrow} — {typeLabel}
        </div>
        <form action={signOut}>
          <button type="submit" className={mono + " text-mid hover:text-sanguine transition-colors"}>
            {t.signOutCta}
          </button>
        </form>
      </div>
      <h1 className="mt-4 mb-10 text-4xl md:text-6xl leading-[0.95] tracking-[-0.03em] font-medium">
        {profile.display_name || t.accountFallbackName}
      </h1>

      {/* Publication status */}
      <div className="mb-14 border border-black/8 bg-white p-5 md:p-7">
        {profile.account_type === "member" ? (
          <p className="m-0 text-[15px] text-mid">{t.accountMemberNote}</p>
        ) : suspended ? (
          <div role="status">
            <div className={mono + " text-sanguine"}>{t.accountSuspended}</div>
            {moderation?.moderator_note && <p className="mt-3 mb-0 text-[15px] text-mid">{moderation.moderator_note}</p>}
          </div>
        ) : profile.is_published ? (
          // TODO(next session): link to /artist/[handle] once public pages
          // read from the database instead of the demo data.
          <div role="status" className={mono + " text-ink"}>
            ● {t.accountStatusPublic}
          </div>
        ) : (
          <div role="status">
            <div className={mono + " text-mid"}>○ {t.accountStatusDraft}</div>
            <ul className="mt-3 mb-0 pl-5 text-[15px] text-ink list-disc">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ProfileForm data={data} />

      {profile.account_type === "artist" && (
        <div className="mt-16 pt-10 border-t border-black/8">
          <ArtworkManager artworks={data.artworks} tags={data.tags} stats={data.stats} imageBaseUrl={imageBaseUrl} />
        </div>
      )}

      <div className="mt-16 pt-10 border-t border-black/8">
        <WatchList items={data.watchlist} imageBaseUrl={imageBaseUrl} />
      </div>

      <div className="mt-16 pt-10 border-t border-black/8">
        <Notifications notifications={data.notifications} prefs={data.notificationPrefs} />
      </div>
    </div>
  );
}

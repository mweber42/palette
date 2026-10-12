"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "@/lib/profile-actions";
import { useLang } from "@/components/LangProvider";
import type { AccountData } from "@/components/AccountView";
import { ARTIST_TERMS, COUNTRIES, EXHIBITION_FREQUENCIES, SPACE_TYPES } from "@/lib/taxonomy";
import { mono } from "@/lib/ui";
import type { Lang } from "@/lib/types";

const initial: ProfileFormState = { status: "idle" };

const fieldClass =
  "bg-transparent border-0 border-b border-black/12 py-3 text-base text-ink outline-none transition-colors duration-300 focus:border-sanguine placeholder:text-mid";

function Options({ list, lang }: { list: Record<string, Record<Lang, string>>; lang: Lang }) {
  return (
    <>
      {Object.entries(list).map(([value, labels]) => (
        <option key={value} value={value}>
          {labels[lang]}
        </option>
      ))}
    </>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-3 text-[15px] leading-snug cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 accent-[#0B0B0A]" />
      <span>{label}</span>
    </label>
  );
}

export default function ProfileForm({ data }: { data: AccountData }) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const { t, lang } = useLang();
  const { profile } = data;
  const type = profile.account_type;

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
      <label className="flex flex-col gap-2.5">
        <span className={mono + " text-mid"}>{type === "space" ? t.signupSpaceName : t.fDisplayName}</span>
        <input type="text" name="display_name" required maxLength={80} defaultValue={profile.display_name} className={fieldClass} />
      </label>

      <label className="flex flex-col gap-2.5">
        <span className={mono + " text-mid"}>{t.fCity}</span>
        <input type="text" name="city" maxLength={80} defaultValue={profile.city ?? ""} className={fieldClass} />
      </label>

      <label className="flex flex-col gap-2.5">
        <span className={mono + " text-mid"}>{t.fCountry}</span>
        <select name="country" defaultValue={profile.country ?? ""} className={fieldClass}>
          <option value="">{t.fChoose}</option>
          <Options list={COUNTRIES} lang={lang} />
        </select>
      </label>

      {type !== "member" && (
        <>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fWebsite}</span>
            <input type="text" name="website" inputMode="url" defaultValue={profile.links?.website ?? ""} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fInstagram}</span>
            <input type="text" name="instagram" placeholder="@" defaultValue={profile.links?.instagram ?? ""} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-2.5 sm:col-span-2">
            <span className={mono + " text-mid"}>{t.fBio}</span>
            <textarea name="bio" rows={3} maxLength={1200} defaultValue={profile.bio ?? ""} className={fieldClass + " resize-y"} />
          </label>
        </>
      )}

      {type === "artist" && (
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7 pt-4">
          <div className="flex flex-col gap-4">
            <Check name="open_to_commissions" label={t.fOpenToCommissions} defaultChecked={!!data.artistDetails?.open_to_commissions} />
            <Check name="print_consent" label={t.fPrintConsent} defaultChecked={!!data.artistPrivate?.print_consent} />
          </div>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fRateRange}</span>
            <input type="text" name="rate_range" maxLength={120} defaultValue={data.artistPrivate?.rate_range ?? ""} className={fieldClass} />
          </label>
        </div>
      )}

      {type === "space" && (
        <>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fSpaceType}</span>
            <select name="space_type" defaultValue={data.spaceDetails?.space_type ?? ""} className={fieldClass}>
              <option value="">{t.fChoose}</option>
              <Options list={SPACE_TYPES} lang={lang} />
            </select>
          </label>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fAddress}</span>
            <input type="text" name="address_public" maxLength={200} defaultValue={data.spaceDetails?.address_public ?? ""} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fHangingSurface}</span>
            <input type="number" name="hanging_surface_m2" min={0} max={100000} defaultValue={data.spaceDetails?.hanging_surface_m2 ?? ""} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fFrequency}</span>
            <select name="exhibition_frequency" defaultValue={data.spaceDetails?.exhibition_frequency ?? ""} className={fieldClass}>
              <option value="">{t.fChoose}</option>
              <Options list={EXHIBITION_FREQUENCIES} lang={lang} />
            </select>
          </label>
          <label className="flex flex-col gap-2.5 sm:col-span-2">
            <span className={mono + " text-mid"}>{t.fArtistTerms}</span>
            <select name="artist_terms" defaultValue={data.spaceDetails?.artist_terms ?? ""} className={fieldClass}>
              <option value="">{t.fChoose}</option>
              <Options list={ARTIST_TERMS} lang={lang} />
            </select>
          </label>
        </>
      )}

      {type === "member" && (
        <div className="sm:col-span-2 flex flex-col gap-4 pt-2">
          <Check name="newsletter_consent" label={t.fNewsletterConsent} defaultChecked={!!data.memberPrivate?.newsletter_consent} />
        </div>
      )}

      <div className="sm:col-span-2 flex items-center gap-6 mt-4">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper border-0 px-8 py-4 font-mono text-[10px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-400 hover:bg-sanguine disabled:opacity-60"
        >
          {pending ? t.savingPending : t.saveCta}
        </button>
        <span aria-live="polite" className={mono + " text-sanguine"}>
          {state.status === "success" && t.profileUpdated}
          {state.status === "error" && t.profileError}
        </span>
      </div>
    </form>
  );
}

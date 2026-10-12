"use client";

import { useActionState, useState } from "react";
import {
  markNotificationsReadAction,
  removeFromWatchlistAction,
  updateNotificationPreferences,
  type NotifPrefsState,
} from "@/lib/profile-actions";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";
import type { AppNotification, NotificationPreferences, WatchItem } from "@/lib/types";

const initial: NotifPrefsState = { status: "idle" };
const fieldClass =
  "bg-transparent border-0 border-b border-black/12 py-3 text-base text-ink outline-none transition-colors duration-300 focus:border-sanguine placeholder:text-mid";

export function WatchList({ items, imageBaseUrl }: { items: WatchItem[]; imageBaseUrl: string }) {
  const { t } = useLang();
  return (
    <section id="en-vue" aria-labelledby="en-vue-title" className="scroll-mt-28">
      <div className={mono + " text-mid"}>{items.length}</div>
      <h2 id="en-vue-title" className="mt-3 mb-2 text-2xl md:text-4xl leading-[0.98] tracking-[-0.03em] font-medium">
        {t.watchHeading}
      </h2>
      <p className="mb-6 text-[15px] text-mid max-w-[60ch]">{t.watchIntro}</p>
      {items.length === 0 ? (
        <p className="text-mid">{t.watchEmpty}</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-black/8 border border-black/8 list-none p-0 m-0">
          {items.map((it) => (
            <li key={it.intent_id} className="bg-paper flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL; next/image remote config comes with the public pages */}
              <img src={imageBaseUrl + it.image_path} alt={it.title || t.untitled} className="w-full aspect-square object-cover bg-white" loading="lazy" />
              <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                <div className="text-[15px] font-medium truncate">{it.title || t.untitled}</div>
                <div className="text-[13px] text-mid truncate">{it.artist_name}</div>
                <form action={removeFromWatchlistAction.bind(null, it.intent_id)} className="mt-auto pt-2">
                  <button type="submit" className="text-[10px] font-mono uppercase tracking-[0.18em] text-mid hover:text-sanguine">
                    {t.watchRemove}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Notifications({
  notifications,
  prefs,
}: {
  notifications: AppNotification[];
  prefs: NotificationPreferences | null;
}) {
  const { t, lang } = useLang();
  const [state, action, pending] = useActionState(updateNotificationPreferences, initial);
  const [sms, setSms] = useState(!!prefs?.sms);
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <section aria-labelledby="notif-title">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="notif-title" className="m-0 text-2xl md:text-4xl leading-[0.98] tracking-[-0.03em] font-medium">
          {t.notifHeading}
          {unread > 0 && <span className={`${mono} ml-3 align-middle text-sanguine`}>● {unread}</span>}
        </h2>
        {unread > 0 && (
          <form action={markNotificationsReadAction}>
            <button type="submit" className={mono + " text-mid hover:text-sanguine transition-colors"}>
              {t.notifMarkRead}
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-6 text-mid">{t.notifEmpty}</p>
      ) : (
        <ul className="mt-6 list-none p-0 m-0 border-t border-black/8">
          {notifications.map((n) => (
            <li key={n.id} className="py-4 border-b border-black/8 flex gap-4">
              <span aria-hidden className={`mt-2 w-1.5 h-1.5 flex-none ${n.read_at ? "bg-transparent" : "bg-sanguine"}`} />
              <div className="min-w-0">
                <div className="text-[15px] font-medium">{lang === "fr" ? n.title_fr : n.title_en}</div>
                {(lang === "fr" ? n.body_fr : n.body_en) && (
                  <p className="mt-1 mb-0 text-[14px] text-mid">{lang === "fr" ? n.body_fr : n.body_en}</p>
                )}
                <div className={`mt-2 ${mono} text-mid`}>{new Date(n.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="mt-10 flex flex-col gap-4 max-w-[480px]">
        <div className={mono + " text-mid"}>{t.notifPrefsHeading}</div>
        <label className="flex items-start gap-3 text-[15px] text-mid">
          <input type="checkbox" checked disabled className="mt-1" />
          <span>{t.notifInApp}</span>
        </label>
        <label className="flex items-start gap-3 text-[15px] cursor-pointer">
          <input type="checkbox" name="notify_email" defaultChecked={!!prefs?.email} className="mt-1 accent-[#0B0B0A]" />
          <span>{t.notifEmail}</span>
        </label>
        <label className="flex items-start gap-3 text-[15px] cursor-pointer">
          <input type="checkbox" name="notify_sms" checked={sms} onChange={(e) => setSms(e.target.checked)} className="mt-1 accent-[#0B0B0A]" />
          <span>{t.notifSms}</span>
        </label>
        {sms && (
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.notifPhone}</span>
            <input type="tel" name="phone" autoComplete="tel" required defaultValue={prefs?.phone ?? ""} placeholder="+33 6 …" className={fieldClass} />
          </label>
        )}
        <div className="flex items-center gap-6 mt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-ink text-paper border-0 px-8 py-4 font-mono text-[10px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-400 hover:bg-sanguine disabled:opacity-60"
          >
            {pending ? t.savingPending : t.saveCta}
          </button>
          <span aria-live="polite" className={mono + " text-sanguine"}>
            {state.status === "success" && t.profileUpdated}
            {state.status === "error" && (state.error === "phone_required" ? t.errPhone : t.profileError)}
          </span>
        </div>
      </form>
    </section>
  );
}

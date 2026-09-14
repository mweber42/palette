"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useLang } from "./LangProvider";
import { subscribeNewsletter, type SubscribeState } from "@/lib/actions";
import { mono } from "@/lib/ui";

const initial: SubscribeState = { status: "idle" };

export default function Footer() {
  const { t } = useLang();
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);

  return (
    <footer className="bg-ink text-offwhite px-5 sm:px-9 md:px-18 pt-14 md:pt-24 pb-8 md:pb-14">
      <div className="max-w-[1680px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 pb-9 md:pb-16 border-b border-white/12">
          <div className="md:col-span-5 min-w-0">
            <div className="text-2xl md:text-4xl font-semibold tracking-[-0.02em]">Palette</div>
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-mid">{t.footerTagline}</p>
          </div>
          <div className={`md:col-span-3 min-w-0 flex flex-col gap-3 ${mono}`}>
            <span className="text-mid">{t.footerExplore}</span>
            <Link href="/" className="hover:text-sanguine transition-colors">{t.navDiscover}</Link>
            <Link href="/artists" className="hover:text-sanguine transition-colors">{t.navArtists}</Link>
            <Link href="/join" className="hover:text-sanguine transition-colors">{t.footerJoin}</Link>
            <Link href="/about" className="hover:text-sanguine transition-colors">{t.navAbout}</Link>
          </div>
          <div className="md:col-span-4 min-w-0">
            <div className={mono + " text-mid"}>{t.newsletterLabel}</div>
            {state.status === "success" ? (
              <div className="mt-4 text-[15px] text-sanguine">{t.subscribed}</div>
            ) : (
              <form action={action} className="flex items-center gap-3 mt-4 border-b border-white/12 pb-2.5">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder={t.emailPh}
                  aria-label={t.emailPh}
                  className="flex-1 min-w-0 bg-transparent border-0 text-[15px] text-offwhite outline-none placeholder:text-mid"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className={`${mono} text-offwhite hover:text-sanguine transition-colors disabled:opacity-50`}
                >
                  {pending ? "…" : t.subscribe}
                </button>
              </form>
            )}
            <div className={`flex gap-4 flex-wrap mt-6 ${mono}`}>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-sanguine transition-colors">Instagram</a>
              <a href="https://pinterest.com" target="_blank" rel="noreferrer" className="hover:text-sanguine transition-colors">Pinterest</a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-sanguine transition-colors">TikTok</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-sanguine transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
        <div className={`flex flex-wrap gap-4 justify-between pt-6 ${mono} text-mid`}>
          <span>© {new Date().getFullYear()} Palette</span>
          <span>{t.footerShipping}</span>
          <span>{t.footerLegal}</span>
        </div>
      </div>
    </footer>
  );
}

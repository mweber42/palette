"use client";

import { use } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import ArtworkTile from "@/components/ArtworkTile";
import { useLang } from "@/components/LangProvider";
import { ARTISTS, artistBySlug, worksByArtist, catLabel, pad } from "@/lib/data";
import { mono, hairlineGrid } from "@/lib/ui";

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t, lang } = useLang();
  const artist = artistBySlug(slug);

  if (!artist) {
    return (
      <div className="max-w-[960px] mx-auto px-5 md:px-18 pt-[160px] pb-40 text-center">
        <div className={`${mono} text-mid`}>{t.notFoundTitle}</div>
        <p className="mt-4 text-2xl">{t.notFoundBody}</p>
        <Link href="/" className={`${mono} inline-block mt-8 border border-black/8 px-6 py-3 hover:border-sanguine hover:text-sanguine`}>
          {t.notFoundCta}
        </Link>
      </div>
    );
  }

  const works = worksByArtist(artist.id);

  return (
    <div>
      <section className="bg-ink text-offwhite px-5 sm:px-9 md:px-18 pt-[120px] md:pt-[160px] lg:pt-[180px] pb-16 md:pb-28">
        <div className="max-w-[1680px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-16 items-end">
          <Reveal className="md:col-span-4 aspect-[4/5] placeholder-art-dark border border-white/12 grid place-items-center min-w-0">
            <div className={`${mono} text-mid text-center`}>{t.portraitPh}</div>
          </Reveal>
          <Reveal index={1} className="md:col-span-8 min-w-0">
            <div className={`${mono} text-mid`}>
              {t.artistLabel} — {pad(ARTISTS.indexOf(artist))} / {pad(ARTISTS.length - 1)}
            </div>
            <h1 className="mt-4 md:mt-7 text-4xl sm:text-6xl lg:text-8xl xl:text-[120px] leading-[0.9] tracking-[-0.03em] font-medium">
              {artist.name}
            </h1>
            <p className="mt-5 md:mt-8 max-w-[50ch] text-base leading-relaxed text-mid">{artist.bio[lang]}</p>
            <div className={`flex gap-5 flex-wrap mt-5 md:mt-9 pt-5 border-t border-white/12 ${mono} text-mid`}>
              <span>{artist.location}</span>
              <span>{catLabel(artist.medium, lang)}</span>
              <span>{works.length} {t.works}</span>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-sanguine transition-colors">Instagram</a>
              <a href="#" className="hover:text-sanguine transition-colors">{t.website}</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 pt-14 md:pt-24">
        <Reveal className="flex items-baseline justify-between gap-6 pb-5 md:pb-7">
          <h2 className="m-0 text-2xl md:text-4xl lg:text-5xl leading-none tracking-[-0.02em] font-medium">
            {t.availablePrints}
          </h2>
          <span className={`${mono} text-mid`}>{works.length} {t.works}</span>
        </Reveal>
        <div className={`${hairlineGrid} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}>
          {works.map((w, i) => (
            <Reveal key={w.id} index={i}>
              <ArtworkTile work={w} aspect="aspect-[3/4]" />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

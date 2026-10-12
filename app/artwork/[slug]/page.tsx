"use client";

import { use } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import ArtworkTile from "@/components/ArtworkTile";
import ShareButton from "@/components/ShareButton";
import { useLang } from "@/components/LangProvider";
import { ARTISTS, ARTWORKS, artworkBySlug, relatedWorks, catLabel, mediumLabel, pad } from "@/lib/data";
import { mono } from "@/lib/ui";

export default function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t, lang } = useLang();
  const work = artworkBySlug(slug);

  if (!work) {
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

  const artist = ARTISTS.find((a) => a.id === work.artistId);
  const index = ARTWORKS.findIndex((w) => w.slug === work.slug);
  const related = relatedWorks(work);

  return (
    <div className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 pt-[120px] md:pt-[160px] lg:pt-[180px]">
      <div className={`flex items-center justify-between gap-6 ${mono} text-mid pb-5 md:pb-8`}>
        <Link href="/" className="hover:text-sanguine transition-colors">{t.back}</Link>
        <span>{pad(index)} / {pad(ARTWORKS.length - 1)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-16 items-start">
        <Reveal className="md:col-span-7 min-w-0">
          <div className="bg-white border border-black/8 p-5 sm:p-8 md:p-16">
            <div className="aspect-[4/5] placeholder-art grid place-items-center overflow-hidden cursor-zoom-in group">
              <div className={`${mono} text-mid text-center transition-transform duration-500 group-hover:scale-150`}>
                {catLabel(work.category, lang)}
                <br />
                {t.zoom}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal index={1} className="md:col-span-5 min-w-0 md:sticky md:top-[120px]">
          <div className={`flex gap-4 flex-wrap ${mono} text-mid`}>
            <span>{catLabel(work.category, lang)}</span>
            <span>·</span>
            <span>{work.dimensions}</span>
            <span>·</span>
            <span>{mediumLabel(work.medium, lang)}</span>
          </div>
          <h1 className="mt-5 md:mt-7 text-4xl sm:text-5xl lg:text-7xl leading-[0.95] tracking-[-0.03em] font-medium">
            {work.title}
          </h1>
          {artist && (
            <Link
              href={`/artist/${artist.slug}`}
              className="flex items-center gap-3.5 mt-5 md:mt-8 py-3.5 border-t border-b border-black/8 hover:text-sanguine transition-colors"
            >
              <span className="w-10 h-10 flex-none placeholder-art border border-black/8" />
              <span className="text-[15px] font-medium">{artist.name}</span>
              <span className={`ml-auto ${mono} text-mid`}>{t.profileArrow}</span>
            </Link>
          )}
          {/* No sales for now (ADR-001): "I want it" records a purchase
              intent, no payment (ADR-002). Demo artworks aren't in the
              database, so here it leads to a free member account. */}
          <p className="mt-5 md:mt-7 text-base leading-relaxed text-mid max-w-[44ch]">{t.presaleNote}</p>
          <Link
            href="/signup?type=member"
            className={`mt-5 md:mt-7 block text-center w-full bg-sanguine text-paper border-0 py-[22px] ${mono} transition-colors duration-400 hover:bg-ink`}
          >
            {t.wantCta}
          </Link>
          <div className={`mt-4 ${mono} text-mid`}>{t.wantHint}</div>
          <div className="mt-6 pt-4 border-t border-black/8">
            <ShareButton
              title={`${work.title} — ${artist?.name ?? "Palette"}`}
              labels={{ share: t.shareCta, copied: t.linkCopied, pinterest: t.pinterestCta }}
            />
          </div>
        </Reveal>
      </div>

      {related.length > 0 && (
        <div className="pt-20 md:pt-36 pb-20 md:pb-36">
          <Reveal className="flex items-baseline justify-between gap-6 pb-4.5 md:pb-7 border-b border-black/8">
            <h2 className="m-0 text-[22px] md:text-4xl leading-none tracking-[-0.02em] font-medium">
              {t.moreFrom} {artist?.name}
            </h2>
            <span className={`${mono} text-mid`}>{t.related}</span>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/8 border border-black/8 border-t-0">
            {related.map((w, i) => (
              <Reveal key={w.id} index={i}>
                <ArtworkTile work={w} aspect="aspect-square" />
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

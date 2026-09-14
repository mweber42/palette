"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import ArtworkTile from "@/components/ArtworkTile";
import { useLang } from "@/components/LangProvider";
import { ARTISTS, ARTWORKS, catLabel } from "@/lib/data";
import { mono, hairlineGrid } from "@/lib/ui";

const FEATURED_INDEXES = [0, 4, 2, 6, 8, 10];
const CAT_KEYS: Array<[string, string]> = [
  ["Photography", "01"],
  ["Illustration", "02"],
  ["Painting", "03"],
  ["Graphic Design", "04"],
  ["Mixed Media", "05"],
];

export default function HomePage() {
  const { t, lang } = useLang();
  const featured = FEATURED_INDEXES.map((i) => ARTWORKS[i]);
  const spotlightArtist = ARTISTS[0];

  return (
    <div>
      {/* Hero */}
      <section className="pt-[120px] md:pt-[160px] lg:pt-[200px] px-5 sm:px-9 md:px-18 max-w-[1680px] mx-auto">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end">
          <div className="col-span-12">
            <div className={`${mono} text-mid mb-6 md:mb-12`}>{t.heroEyebrow}</div>
            <h1 className="m-0 max-w-[15ch] text-[48px] sm:text-[80px] lg:text-[120px] xl:text-[160px] leading-[0.9] tracking-[-0.03em] font-medium">
              {t.heroHeadline}
            </h1>
          </div>
          <div className="col-span-12 flex flex-wrap items-end justify-between gap-8 pt-7 md:pt-14">
            <p className="m-0 max-w-[44ch] text-base leading-relaxed text-mid">{t.heroLede}</p>
            <Link
              href="/artists"
              className={`${mono} bg-ink text-offwhite px-8 py-[18px] transition-colors duration-400 hover:bg-sanguine`}
            >
              {t.heroCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Hero image with glass caption */}
      <section className="pt-12 md:pt-24 px-5 sm:px-9 md:px-18 max-w-[1680px] mx-auto">
        <Reveal className="relative aspect-[16/7] placeholder-art border border-black/8 grid place-items-center">
          <div className={`${mono} text-mid text-center`}>{t.heroImgPh}</div>
          <div
            className="absolute left-0 bottom-0 px-4 sm:px-6 py-3.5 sm:py-5"
            style={{
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(255,255,255,0.4)",
              borderRight: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 60px -30px rgba(11,11,10,0.35)",
            }}
          >
            <div className={`${mono} text-mid`}>{t.featuredTag}</div>
            <div className="mt-2.5 text-[17px] font-medium tracking-[-0.01em]">
              {ARTWORKS[0].title} —{" "}
              <Link href={`/artist/${spotlightArtist.slug}`} className="hover:text-sanguine hover:underline underline-offset-4 decoration-sanguine">
                {spotlightArtist.name}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Browse by medium */}
      <section className="pt-20 md:pt-36 lg:pt-40 px-5 sm:px-9 md:px-18 max-w-[1680px] mx-auto">
        <Reveal className="flex items-baseline justify-between gap-6 pb-5 md:pb-9 border-b border-black/8">
          <h2 className="m-0 text-[28px] md:text-5xl lg:text-6xl leading-none tracking-[-0.02em] font-medium">
            {t.mediumsHeading}
          </h2>
          <div className={`${mono} text-mid`}>{t.mediumsCount}</div>
        </Reveal>
        <div className={`${hairlineGrid} grid-cols-1 sm:grid-cols-2 md:grid-cols-12 border-t-0`}>
          {CAT_KEYS.map(([key, num], i) => (
            <Reveal key={key} index={i} className={i < 3 ? "md:col-span-4" : "md:col-span-6"}>
              <Link
                href="/artists"
                className="group bg-paper text-ink min-h-[160px] md:min-h-[220px] p-5 md:p-7 flex flex-col justify-between transition-colors duration-400 hover:bg-sanguine/[0.85] hover:text-white h-full"
              >
                <div className={`${mono}`}>{num}</div>
                <div className="text-[22px] md:text-[32px] tracking-[-0.02em] font-medium">
                  {catLabel(key, lang)}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured works */}
      <section className="pt-20 md:pt-36 lg:pt-40 px-5 sm:px-9 md:px-18 max-w-[1680px] mx-auto">
        <Reveal className="flex items-baseline justify-between gap-6 pb-5 md:pb-9">
          <h2 className="m-0 text-[28px] md:text-5xl lg:text-6xl leading-none tracking-[-0.02em] font-medium">
            {t.worksHeading}
          </h2>
          <div className={`${mono} text-mid`}>{t.worksCount}</div>
        </Reveal>
        <div className={`${hairlineGrid} grid-cols-2 md:grid-cols-12`}>
          <Reveal index={0} className="col-span-2 md:col-span-6">
            <ArtworkTile work={featured[0]} aspect="aspect-[4/3]" big />
          </Reveal>
          <Reveal index={1} className="col-span-1 md:col-span-3">
            <ArtworkTile work={featured[1]} aspect="aspect-[3/4]" />
          </Reveal>
          <Reveal index={2} className="col-span-1 md:col-span-3">
            <ArtworkTile work={featured[2]} aspect="aspect-[3/4]" />
          </Reveal>
          <Reveal index={3} className="col-span-1 md:col-span-3">
            <ArtworkTile work={featured[3]} aspect="aspect-square" />
          </Reveal>
          <Reveal index={4} className="col-span-1 md:col-span-3">
            <ArtworkTile work={featured[4]} aspect="aspect-square" />
          </Reveal>
          <Reveal index={5} className="col-span-2 md:col-span-6">
            <ArtworkTile work={featured[5]} aspect="aspect-[4/3]" big />
          </Reveal>
        </div>
        <Reveal className="flex justify-center pt-8 md:pt-16">
          <Link
            href="/artists"
            className={`${mono} border border-black/8 px-7 py-4 transition-colors duration-300 hover:border-sanguine hover:text-sanguine`}
          >
            {t.viewAll}
          </Link>
        </Reveal>
      </section>

      {/* Featured artist spotlight (inverted) */}
      <section className="mt-20 md:mt-36 lg:mt-40 bg-ink text-offwhite px-5 sm:px-9 md:px-18 py-16 md:py-32 lg:py-36">
        <div className="max-w-[1680px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-16 items-center">
          <Reveal className="md:col-span-5 aspect-[4/5] placeholder-art-dark border border-white/12 grid place-items-center min-w-0">
            <div className={`${mono} text-mid text-center`}>{t.portraitPh}</div>
          </Reveal>
          <Reveal index={1} className="md:col-span-7 min-w-0">
            <div className={`${mono} text-mid`}>{t.spotlightEyebrow}</div>
            <h2 className="mt-5 md:mt-9 text-4xl sm:text-6xl lg:text-8xl xl:text-[110px] leading-[0.92] tracking-[-0.03em] font-medium">
              {spotlightArtist.name.split(" ")[0]}
              <br />
              {spotlightArtist.name.split(" ").slice(1).join(" ")}
            </h2>
            <p className="mt-5 md:mt-8 max-w-[48ch] text-base leading-relaxed text-mid">
              {spotlightArtist.bio[lang]}
            </p>
            <div className={`flex gap-6 flex-wrap mt-6 md:mt-10 ${mono} text-mid`}>
              <span>{spotlightArtist.location}</span>
              <span>{catLabel(spotlightArtist.medium, lang)}</span>
              <span>{t.spotlightWorks}</span>
            </div>
            <Link
              href={`/artist/${spotlightArtist.slug}`}
              className={`inline-block mt-7 md:mt-12 border border-white/12 text-offwhite px-7 py-4 ${mono} transition-colors duration-300 hover:border-sanguine hover:text-sanguine`}
            >
              {t.viewProfile}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* For artists band */}
      <section className="relative bg-ink px-5 sm:px-9 md:px-18 py-16 md:py-32 lg:py-36 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 64px), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 64px)",
          }}
        />
        <Reveal
          className="relative max-w-[960px] mx-auto p-7 sm:p-12 lg:p-18 text-offwhite"
          style={{
            background: "rgba(10,10,10,0.55)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.4)",
            borderLeft: "1px solid rgba(255,255,255,0.14)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 50px 90px -50px rgba(0,0,0,0.9)",
          }}
        >
          <div className={`${mono} text-mid`}>{t.bandEyebrow}</div>
          <h2 className="mt-5 md:mt-7 max-w-[20ch] text-3xl sm:text-5xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-[-0.03em] font-medium">
            {t.bandHeading}
          </h2>
          <p className="mt-5 md:mt-7 max-w-[52ch] text-base leading-relaxed text-mid">{t.bandBody}</p>
          <div className="flex items-center gap-6 flex-wrap mt-7 md:mt-11">
            <Link
              href="/join"
              className={`${mono} bg-sanguine text-paper px-8 py-[18px] transition-colors duration-400 hover:bg-offwhite hover:text-ink`}
            >
              {t.bandCta}
            </Link>
            <span className={`${mono} text-mid`}>{t.bandNote}</span>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

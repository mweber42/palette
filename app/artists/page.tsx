"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LangProvider";
import { ARTISTS, catLabel, pad } from "@/lib/data";
import { mono, hairlineGrid } from "@/lib/ui";

export default function ArtistsPage() {
  const { t, lang } = useLang();

  return (
    <div className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 pt-[120px] md:pt-[160px] lg:pt-[180px] pb-20 md:pb-36">
      <Reveal className={`${mono} text-mid`}>
        {t.artistsIndex} — {ARTISTS.length} {t.artistsUnit}
      </Reveal>
      <Reveal index={1} className="mt-5 md:mt-8 mb-8 md:mb-16 text-[44px] sm:text-7xl lg:text-8xl xl:text-[140px] leading-[0.9] tracking-[-0.03em] font-medium max-w-[16ch]">
        {t.artistsHeadline}
      </Reveal>
      <div className={`${hairlineGrid} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}>
        {ARTISTS.map((person, i) => (
          <Reveal key={person.id} index={i}>
            <Link href={`/artist/${person.slug}`} className="group bg-paper flex flex-col transition-colors duration-300 hover:bg-[#F2F2EF] h-full">
              <div className="relative aspect-square overflow-hidden placeholder-art grid place-items-center">
                <div className={`${mono} text-mid transition-transform duration-400 group-hover:scale-[1.03]`}>{t.portraitShort}</div>
              </div>
              <div className="p-4 md:p-6 flex flex-col gap-2">
                <div className={`${mono} text-mid`}>
                  {pad(i)} — {catLabel(person.medium, lang)}
                </div>
                <div className="text-lg md:text-2xl font-medium tracking-[-0.02em]">{person.name}</div>
                <div className={`${mono} text-mid`}>{person.location}</div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";

export default function AboutPage() {
  const { t } = useLang();

  const rows = [
    { label: t.missionLabel, body: t.missionBody },
    { label: t.curationLabel, body: t.curationBody },
    { label: t.craftLabel, body: t.craftBody },
  ];

  // Commitments, not traction figures: no number here depends on data we
  // don't have yet (placeholders such as "94 countries" were removed).
  const stats = [
    { value: "0 €", label: t.statArtistFees },
    { value: "0", label: t.statRankings },
    { value: "100 %", label: t.statCredited },
    { value: "0", label: t.statAiTraining },
  ];

  return (
    <div>
      <section className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 pt-[120px] md:pt-[160px] lg:pt-[180px]">
        <Reveal className={`${mono} text-mid`}>{t.aboutEyebrow}</Reveal>
        <Reveal index={1} className="mt-5 md:mt-8 mb-12 md:mb-24 text-[44px] sm:text-7xl lg:text-8xl xl:text-[140px] leading-[0.9] tracking-[-0.03em] font-medium max-w-[14ch]">
          {t.aboutHeadline}
        </Reveal>

        {rows.map((row, i) => (
          <Reveal
            key={row.label}
            index={i + 2}
            className={`grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-12 py-7 md:py-12 border-t border-black/8 ${
              i === rows.length - 1 ? "border-b" : ""
            }`}
          >
            <div className={`sm:col-span-3 ${mono} text-mid`}>{row.label}</div>
            <p className="sm:col-span-9 m-0 text-2xl md:text-4xl leading-[1.25] tracking-[-0.02em] max-w-[34ch]">
              {row.body}
            </p>
          </Reveal>
        ))}

        <Reveal index={rows.length + 2} className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-12 pt-10 md:pt-20 pb-20 md:pb-36">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-[30px] md:text-5xl lg:text-6xl font-medium tracking-[-0.03em]">{s.value}</div>
              <div className={`mt-2.5 ${mono} text-mid`}>{s.label}</div>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="mt-16 md:mt-32 bg-ink text-offwhite px-5 sm:px-9 md:px-18 py-20 md:py-40 lg:py-44">
        <Reveal className="max-w-[1680px] mx-auto">
          <div className={`${mono} text-mid`}>{t.closingLabel}</div>
          <p className="mt-5 md:mt-9 text-3xl sm:text-6xl lg:text-8xl leading-[0.98] tracking-[-0.03em] font-medium max-w-[24ch]">
            {t.closingLine}
          </p>
          <Link
            href="/join"
            className={`inline-block mt-8 md:mt-14 border border-sanguine text-sanguine px-8 py-[18px] ${mono} transition-colors duration-400 hover:bg-sanguine hover:text-paper`}
          >
            {t.navJoin}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}

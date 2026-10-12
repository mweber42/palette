"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LangProvider";
import { mono, hairlineGrid } from "@/lib/ui";

// v2: /join is where everyone chooses their account type. The old anonymous
// artist application form (no account behind it) is retired — artists now
// create a real profile that goes live once complete (ADR-009).
export default function JoinPage() {
  const { t } = useLang();

  const choices = [
    { href: "/signup?type=artist", num: "01", title: t.joinArtistTitle, body: t.joinArtistBody },
    { href: "/signup?type=space", num: "02", title: t.joinSpaceTitle, body: t.joinSpaceBody },
    { href: "/signup?type=member", num: "03", title: t.joinMemberTitle, body: t.joinMemberBody },
  ];

  return (
    <div>
      <section className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 pt-[120px] md:pt-[160px] lg:pt-[180px]">
        <Reveal className={`${mono} text-mid`}>{t.joinEyebrow}</Reveal>
        <Reveal index={1} className="mt-5 md:mt-8 text-[44px] sm:text-7xl lg:text-8xl xl:text-[140px] leading-[0.9] tracking-[-0.03em] font-medium max-w-[15ch]">
          {t.joinHeadline}
        </Reveal>
        <Reveal index={2} className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 mt-10 md:mt-20 pt-7 md:pt-12 border-t border-black/8">
          <div>
            <div className={`${mono} text-mid`}>{t.value1Title}</div>
            <p className="mt-3.5 text-base leading-relaxed text-mid">{t.value1Body}</p>
          </div>
          <div>
            <div className={`${mono} text-mid`}>{t.value2Title}</div>
            <p className="mt-3.5 text-base leading-relaxed text-mid">{t.value2Body}</p>
          </div>
          <div>
            <div className={`${mono} text-mid`}>{t.value3Title}</div>
            <p className="mt-3.5 text-base leading-relaxed text-mid">{t.value3Body}</p>
          </div>
        </Reveal>
      </section>

      <section className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 pt-20 md:pt-36 pb-20 md:pb-36">
        <Reveal className="flex items-baseline justify-between gap-6 pb-5 md:pb-9 border-b border-black/8">
          <h2 className="m-0 text-[28px] md:text-5xl lg:text-6xl leading-none tracking-[-0.02em] font-medium">
            {t.joinChooseEyebrow}
          </h2>
        </Reveal>
        <div className={`${hairlineGrid} grid-cols-1 md:grid-cols-12 border-t-0`}>
          {choices.map((c, i) => (
            <Reveal key={c.href} index={i} className="md:col-span-4">
              <Link
                href={c.href}
                className="group bg-paper text-ink min-h-[240px] md:min-h-[320px] p-6 md:p-9 flex flex-col h-full transition-colors duration-400 hover:bg-ink hover:text-offwhite"
              >
                <div className={`${mono} text-mid`}>{c.num}</div>
                <div className="mt-12 md:mt-20 text-[28px] md:text-[40px] leading-none tracking-[-0.02em] font-medium">{c.title}</div>
                <p className="mt-4 text-[15px] leading-relaxed text-mid max-w-[36ch]">{c.body}</p>
                <div className={`${mono} mt-auto pt-6 self-start border-b border-transparent group-hover:border-sanguine group-hover:text-sanguine transition-colors`}>
                  {t.joinChooseCta} →
                </div>
              </Link>
            </Reveal>
          ))}
          <Reveal index={3} className="md:col-span-12">
            <div className="bg-paper p-6 md:p-9 flex flex-wrap items-center justify-between gap-4 text-mid">
              <div>
                <div className="text-lg md:text-2xl tracking-[-0.02em] font-medium text-ink/50">{t.joinOrgTitle}</div>
                <p className="mt-2 text-[15px] leading-relaxed">{t.joinOrgBody}</p>
              </div>
              <span className={`${mono} border border-black/12 px-4 py-2.5`}>{t.joinOrgSoon}</span>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

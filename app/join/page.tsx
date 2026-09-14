"use client";

import Reveal from "@/components/Reveal";
import JoinForm from "@/components/JoinForm";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";

export default function JoinPage() {
  const { t } = useLang();

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

      <section className="relative bg-ink mt-16 md:mt-32 py-16 md:py-32 px-5 sm:px-9 md:px-18 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 64px), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 64px)",
          }}
        />
        <Reveal
          className="relative max-w-[880px] mx-auto p-7 sm:p-12 lg:p-16 text-offwhite"
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
          <JoinForm />
        </Reveal>
      </section>
    </div>
  );
}

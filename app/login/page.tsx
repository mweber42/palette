"use client";

import Reveal from "@/components/Reveal";
import LoginForm from "@/components/LoginForm";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";

export default function LoginPage() {
  const { t } = useLang();

  return (
    <section className="max-w-[880px] mx-auto px-5 sm:px-9 pt-[120px] md:pt-[160px] pb-24">
      <Reveal className={mono + " text-mid"}>{t.loginEyebrow}</Reveal>
      <Reveal index={1} className="mt-5 mb-12 text-4xl md:text-6xl leading-[0.95] tracking-[-0.03em] font-medium">
        {t.loginHeadline}
      </Reveal>
      <LoginForm />
    </section>
  );
}

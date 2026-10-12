"use client";

import Reveal from "@/components/Reveal";
import SignupForm from "@/components/SignupForm";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";
import type { SignupAccountType } from "@/lib/types";

export default function SignupView({ accountType }: { accountType: SignupAccountType }) {
  const { t } = useLang();

  return (
    <section className="max-w-[880px] mx-auto px-5 sm:px-9 pt-[120px] md:pt-[160px] pb-24">
      <Reveal className={mono + " text-mid"}>{t.signupEyebrow}</Reveal>
      <Reveal index={1} className="mt-5 mb-12 text-4xl md:text-6xl leading-[0.95] tracking-[-0.03em] font-medium">
        {t.signupHeadline}
      </Reveal>
      <SignupForm accountType={accountType} />
    </section>
  );
}

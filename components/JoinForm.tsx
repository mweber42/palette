"use client";

import { useActionState } from "react";
import { useLang } from "./LangProvider";
import { submitApplication, type ApplyState } from "@/lib/actions";
import { mono } from "@/lib/ui";

const initial: ApplyState = { status: "idle" };

const fieldClass =
  "bg-transparent border-0 border-b border-white/12 py-3 text-base text-offwhite outline-none transition-colors duration-300 focus:border-sanguine placeholder:text-mid";

export default function JoinForm() {
  const { t, lang } = useLang();
  const [state, action, pending] = useActionState(submitApplication, initial);

  if (state.status === "success") {
    return (
      <div className="text-center py-8 md:py-16">
        <div className={`${mono} text-sanguine`}>{t.received}</div>
        <h2 className="mt-5 md:mt-7 text-3xl md:text-6xl leading-[0.95] tracking-[-0.03em] font-medium">
          {t.thanks} {state.firstName || (lang === "fr" ? "cher artiste" : "artist")}.
        </h2>
        <p className="mt-5 mx-auto max-w-[42ch] text-base leading-relaxed text-mid">{t.receivedBody}</p>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="lang" value={lang} />
      <div className={mono + " text-mid"}>{t.formEyebrow}</div>
      <h2 className="mt-4 mb-7 md:mb-11 text-3xl md:text-5xl leading-[0.98] tracking-[-0.03em] font-medium">
        {t.formHeading}
      </h2>

      {state.status === "error" && (
        <div className="mb-6 text-sm text-sanguine">{t.formError}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fName}</span>
          <input type="text" name="name" required placeholder="Mira Halvorsen" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fEmail}</span>
          <input type="email" name="email" required placeholder="you@studio.com" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fPortfolio}</span>
          <input type="url" name="portfolio" placeholder="https://" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fMedium}</span>
          <select name="medium" defaultValue={t.catPhoto} className={fieldClass + " appearance-none rounded-none"}>
            {[t.catPhoto, t.catIllus, t.catPaint, t.catGraphic, t.catMixed].map((c) => (
              <option key={c} value={c} className="text-ink">{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fPlace}</span>
          <input type="text" name="place" placeholder="Norway, Lofoten" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fBio}</span>
          <textarea name="bio" rows={1} placeholder={t.fBioPh} className={fieldClass + " resize-y"} />
        </label>
      </div>

      <div className="flex items-center gap-6 flex-wrap mt-8 md:mt-11 pt-6 md:pt-8 border-t border-white/12">
        <button
          type="submit"
          disabled={pending}
          className="bg-sanguine text-paper border-0 px-8 py-5 font-mono text-[10px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-400 hover:bg-offwhite hover:text-ink disabled:opacity-60"
        >
          {pending ? t.submitting : t.submitApp}
        </button>
        <span className={mono + " text-mid"}>{t.freeNote}</span>
      </div>
    </form>
  );
}

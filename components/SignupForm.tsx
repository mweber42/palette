"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/lib/auth-actions";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";
import type { SignupAccountType } from "@/lib/types";

const initial: AuthState = { status: "idle" };

const fieldClass =
  "bg-transparent border-0 border-b border-black/12 py-3 text-base text-ink outline-none transition-colors duration-300 focus:border-sanguine placeholder:text-mid";

export default function SignupForm({ accountType }: { accountType: SignupAccountType }) {
  const [state, action, pending] = useActionState(signUp, initial);
  const { t, lang } = useLang();

  const typeLabel = {
    artist: t.joinArtistTitle,
    space: t.joinSpaceTitle,
    member: t.joinMemberTitle,
  }[accountType];

  if (state.status === "check_email") {
    return (
      <div className="text-center py-16">
        <div className={mono + " text-sanguine"}>{t.checkEmailTitle}</div>
        <p className="mt-4 text-base text-mid">{t.checkEmailBody}</p>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-[480px]">
      <input type="hidden" name="account_type" value={accountType} />
      <input type="hidden" name="lang" value={lang} />

      <div className="flex items-center justify-between gap-4 mb-10 pb-4 border-b border-black/8">
        <span className={mono + " text-mid"}>
          {t.signupAs} — <span className="text-ink">{typeLabel}</span>
        </span>
        <Link href="/join" className={mono + " text-mid hover:text-sanguine transition-colors"}>
          {t.signupChangeType}
        </Link>
      </div>

      {state.status === "error" && (
        <div role="alert" className="mb-6 text-sm text-sanguine">
          {state.error === "signup_failed" ? t.signupErrorTaken : t.signupErrorGeneric}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>
            {accountType === "space" ? t.signupSpaceName : t.fDisplayName}
          </span>
          <input type="text" name="name" required autoComplete={accountType === "space" ? "organization" : "name"} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fEmail}</span>
          <input type="email" name="email" required autoComplete="email" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fPassword}</span>
          <input type="password" name="password" required minLength={8} autoComplete="new-password" className={fieldClass} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-8 bg-sanguine text-paper border-0 px-8 py-4 font-mono text-[10px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-400 hover:bg-ink disabled:opacity-60"
      >
        {pending ? t.signupPending : t.signupCta}
      </button>
    </form>
  );
}

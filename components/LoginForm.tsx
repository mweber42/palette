"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/lib/auth-actions";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";

const initial: AuthState = { status: "idle" };

const fieldClass =
  "bg-transparent border-0 border-b border-black/12 py-3 text-base text-ink outline-none transition-colors duration-300 focus:border-sanguine placeholder:text-mid";

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  const { t } = useLang();

  return (
    <form action={action} className="max-w-[480px]">
      {state.status === "error" && (
        <div className="mb-6 text-sm text-sanguine">{t.loginError}</div>
      )}

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fEmail}</span>
          <input type="email" name="email" required className={fieldClass} />
        </label>
        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.fPassword}</span>
          <input type="password" name="password" required className={fieldClass} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-8 bg-sanguine text-paper border-0 px-8 py-4 font-mono text-[10px] tracking-[0.18em] uppercase cursor-pointer transition-colors duration-400 hover:bg-ink disabled:opacity-60"
      >
        {pending ? t.loginPending : t.loginCta}
      </button>
    </form>
  );
}

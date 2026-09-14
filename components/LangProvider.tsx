"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { COPY, type CopyShape } from "@/lib/copy";
import type { Lang } from "@/lib/types";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: CopyShape;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("palette_lang");
      // One-time sync from an external system (localStorage) on mount — the
      // default "en" render must match the server first to avoid a hydration
      // mismatch, so this can't be a lazy useState initializer instead.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "fr" || saved === "en") setLangState(saved);
    } catch {
      // localStorage unavailable (private browsing etc.) — default to English.
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("palette_lang", l);
    } catch {
      // ignore
    }
  };

  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t: COPY[lang] as CopyShape }),
    [lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
}

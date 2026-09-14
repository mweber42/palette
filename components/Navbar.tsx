"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { mono } from "@/lib/ui";

export default function Navbar() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Frosted as soon as we're off the homepage hero, or once scrolled past it.
  const frosted = scrolled || pathname !== "/";

  const links = [
    { href: "/", label: t.navDiscover },
    { href: "/artists", label: t.navArtists },
    { href: "/about", label: t.navAbout },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-[420ms]"
      style={{
        background: frosted ? "rgba(255,255,255,0.65)" : "transparent",
        backdropFilter: frosted ? "blur(24px)" : "blur(0px)",
        WebkitBackdropFilter: frosted ? "blur(24px)" : "blur(0px)",
        borderBottomColor: frosted ? "rgba(0,0,0,0.08)" : "transparent",
        boxShadow: frosted ? "0 24px 60px -40px rgba(11,11,10,0.4)" : "none",
      }}
    >
      <div className="max-w-[1680px] mx-auto px-5 sm:px-9 md:px-18 h-[72px] flex items-center gap-4 md:gap-14">
        <Link href="/" className="text-[19px] font-semibold tracking-[-0.02em] flex-none text-ink">
          Palette
        </Link>
        <div className="flex-1" />
        <div className={`hidden md:flex items-center gap-6 lg:gap-8 ${mono}`}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`py-1 hover:text-sanguine hover:underline underline-offset-[5px] decoration-sanguine transition-colors ${
                pathname === l.href ? "text-sanguine" : "text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <span className="flex items-center gap-2 text-mid">
            <button
              type="button"
              onClick={() => setLang("en")}
              className="py-1 tracking-[0.18em]"
              style={{
                color: lang === "en" ? "#C1440E" : "#8C8A86",
                borderBottom: lang === "en" ? "1px solid #C1440E" : "1px solid transparent",
              }}
            >
              EN
            </button>
            <span className="opacity-45">/</span>
            <button
              type="button"
              onClick={() => setLang("fr")}
              className="py-1 tracking-[0.18em]"
              style={{
                color: lang === "fr" ? "#C1440E" : "#8C8A86",
                borderBottom: lang === "fr" ? "1px solid #C1440E" : "1px solid transparent",
              }}
            >
              FR
            </button>
          </span>
          <Link
            href="/join"
            className="border border-sanguine text-sanguine px-[18px] py-[11px] transition-colors duration-300 hover:bg-sanguine hover:text-paper"
          >
            {t.navJoin}
          </Link>
        </div>

        {/* Mobile: compact links, no wasted chrome */}
        <div className={`flex md:hidden items-center gap-4 ${mono}`}>
          <Link href="/join" className="border border-sanguine text-sanguine px-3 py-2">
            {t.navJoin}
          </Link>
        </div>
      </div>
    </nav>
  );
}

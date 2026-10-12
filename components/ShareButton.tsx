"use client";

import { useState } from "react";
import { mono } from "@/lib/ui";

// Mobile: the native share sheet (Instagram, WhatsApp, Messages…) through
// the Web Share API. Desktop browsers mostly lack it, so we fall back to
// "copy link" plus a direct Pinterest pin. Nothing is stored in the
// database (spec §3.5): sharing is tracked, later, by the analytics tool.
export default function ShareButton({
  title,
  labels,
}: {
  title: string;
  labels: { share: string; copied: string; pinterest: string };
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User closed the sheet: nothing to do.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare): leave the URL bar as the fallback.
    }
  }

  function pin() {
    const url = encodeURIComponent(window.location.href);
    const description = encodeURIComponent(title);
    window.open(
      `https://www.pinterest.com/pin/create/button/?url=${url}&description=${description}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="flex items-center gap-5">
      <button type="button" onClick={share} className={`${mono} py-2 text-ink hover:text-sanguine transition-colors`}>
        {copied ? labels.copied : labels.share}
      </button>
      <button type="button" onClick={pin} className={`${mono} py-2 text-mid hover:text-sanguine transition-colors`}>
        {labels.pinterest}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { wantArtwork } from "@/lib/profile-actions";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";

// "I want it" (ADR-002): one click adds the work to the user's "En vue"
// list and confirms in plain words. Visitors without an account are sent
// to the free member signup. Used on real (database) artwork pages.
export default function WantButton({ artworkId, signedIn }: { artworkId: string; signedIn: boolean }) {
  const { t } = useLang();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!signedIn) {
    return (
      <div>
        <Link
          href="/signup?type=member"
          className={`block text-center w-full bg-sanguine text-paper py-[22px] ${mono} transition-colors duration-400 hover:bg-ink`}
        >
          {t.wantCta}
        </Link>
        <div className={`mt-4 ${mono} text-mid`}>{t.wantHint}</div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending || message !== null}
        onClick={() =>
          startTransition(async () => {
            const res = await wantArtwork(artworkId);
            if (res.ok) {
              setError(false);
              setMessage((res.already ? t.wantAlready : t.wantAdded).replace("{title}", res.title || t.untitled));
            } else {
              setError(true);
              setMessage(t.errGeneric);
            }
          })
        }
        className={`w-full bg-sanguine text-paper border-0 py-[22px] ${mono} cursor-pointer transition-colors duration-400 hover:bg-ink disabled:cursor-default disabled:hover:bg-sanguine`}
      >
        {t.wantCta}
      </button>
      {message && (
        <div role={error ? "alert" : "status"} className="mt-4 text-[15px] leading-relaxed">
          <span className={error ? "text-sanguine" : "text-ink"}>{message}</span>{" "}
          {!error && (
            <Link href="/account#en-vue" className="underline underline-offset-4 decoration-sanguine hover:text-sanguine">
              {t.wantSeeList}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

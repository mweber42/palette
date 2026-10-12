"use client";

import Link from "next/link";
import type { Artwork } from "@/lib/types";
import { ARTISTS, catLabel } from "@/lib/data";
import { useLang } from "./LangProvider";
import { mono } from "@/lib/ui";

export default function ArtworkTile({
  work,
  aspect = "aspect-[3/4]",
  big = false,
}: {
  work: Artwork;
  aspect?: string;
  big?: boolean;
}) {
  const { lang } = useLang();
  const artist = ARTISTS.find((a) => a.id === work.artistId);
  const category = catLabel(work.category, lang);

  return (
    <div className="bg-paper flex flex-col">
      <Link
        href={`/artwork/${work.slug}`}
        role="img"
        aria-label={`${work.title} — ${artist?.name} (${category})`}
        className={`group block relative overflow-hidden placeholder-art ${aspect}`}
      >
        <div className={`absolute inset-0 grid place-items-center ${mono} text-mid transition-transform duration-400 group-hover:scale-[1.03]`}>
          {category}
        </div>
      </Link>
      <div className={big ? "p-4 md:p-6 flex flex-col gap-2.5" : "p-3.5 md:p-5 flex flex-col gap-2"}>
        <div className={`${mono} text-mid`}>{category}</div>
        <Link
          href={`/artwork/${work.slug}`}
          className={`font-medium tracking-[-0.01em] hover:text-sanguine hover:underline underline-offset-[5px] decoration-sanguine transition-colors ${
            big ? "text-lg md:text-2xl" : "text-base md:text-[17px]"
          }`}
        >
          {work.title}
        </Link>
        {artist && (
          <Link
            href={`/artist/${artist.slug}`}
            className={`text-mid hover:text-sanguine hover:underline underline-offset-4 decoration-sanguine transition-colors ${
              big ? "text-sm" : "text-[13px]"
            }`}
          >
            {artist.name}
          </Link>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createArtwork,
  deleteArtworkAction,
  prepareArtworkUpload,
  proposeTag,
  setPresaleAction,
} from "@/lib/profile-actions";
import { useLang } from "@/components/LangProvider";
import { mono } from "@/lib/ui";
import type { ArtworkWithTags, Tag, TagKind } from "@/lib/types";

const fieldClass =
  "bg-transparent border-0 border-b border-black/12 py-3 text-base text-ink outline-none transition-colors duration-300 focus:border-sanguine placeholder:text-mid";

const LIMITS: Record<TagKind, number> = { technique: 3, style: 5 };

function TagPicker({
  kind,
  tags,
  selected,
  onToggle,
  onProposed,
}: {
  kind: TagKind;
  tags: Tag[];
  selected: string[];
  onToggle: (id: string) => void;
  onProposed: (tag: Tag) => void;
}) {
  const { t, lang } = useLang();
  const [proposal, setProposal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = selected.length >= LIMITS[kind];

  function submitProposal() {
    const label = proposal.trim();
    if (label.length < 2) return;
    setError(null);
    startTransition(async () => {
      const res = await proposeTag(label, kind);
      if (res.ok) {
        onProposed({ ...res.tag, kind: res.tag.kind as TagKind, slug: "", status: res.tag.status as Tag["status"], proposed_by: null });
        setProposal("");
      } else {
        setError(res.error === "already_proposed" ? t.errAlreadyProposed : res.error === "rate_limited" ? t.errRateLimited : t.errGeneric);
      }
    });
  }

  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className={mono + " text-mid mb-3"}>
        {kind === "technique" ? t.fTechniques : t.fStyles} — {selected.length}/{LIMITS[kind]}
      </legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const on = selected.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => onToggle(tag.id)}
              className={`px-3 py-2 text-[13px] border transition-colors duration-300 disabled:opacity-35 disabled:cursor-not-allowed ${
                on ? "bg-ink text-paper border-ink" : "border-black/12 text-ink hover:border-ink"
              }`}
            >
              {lang === "fr" ? tag.label_fr : tag.label_en}
              {tag.status === "proposed" && <span className="ml-1.5 opacity-60">· {t.pendingTag}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3 mt-4">
        <label className="flex flex-col gap-2 min-w-[220px]">
          <span className={mono + " text-mid"}>{kind === "technique" ? t.fProposeTag : t.fProposeStyle}</span>
          <input
            type="text"
            value={proposal}
            maxLength={40}
            placeholder={kind === "technique" ? t.fProposePh : t.fProposeStylePh}
            onChange={(e) => setProposal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitProposal();
              }
            }}
            className={fieldClass + " py-2 text-[15px]"}
          />
        </label>
        <button
          type="button"
          onClick={submitProposal}
          disabled={pending || proposal.trim().length < 2}
          className={`${mono} border border-black/12 px-4 py-2.5 hover:border-ink disabled:opacity-40`}
        >
          {t.proposeCta}
        </button>
      </div>
      {error && <div role="alert" className="mt-2 text-sm text-sanguine">{error}</div>}
    </fieldset>
  );
}

export default function ArtworkManager({
  artworks,
  tags: initialTags,
  stats,
  imageBaseUrl,
}: {
  artworks: ArtworkWithTags[];
  tags: Tag[];
  stats: Record<string, { likes: number; wishes: number }>;
  imageBaseUrl: string;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [tags, setTags] = useState(initialTags);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max: number) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : list.length < max ? [...list, id] : list);

  const errorText = (code: string) =>
    ({
      invalid_type: t.errInvalidImage,
      too_big: t.errTooBig,
      techniques_count: t.errTechnique,
      styles_count: t.errStyles,
    })[code] ?? t.uploadFailedError;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return setMessage({ kind: "error", text: t.errNoFile });
    if (techniques.length < 1 || techniques.length > 3) return setMessage({ kind: "error", text: t.errTechnique });

    setBusy(true);
    try {
      // 1. One-time signed upload URL, created by the server.
      const prep = await prepareArtworkUpload({ type: file.type, size: file.size });
      if (!prep.ok) return setMessage({ kind: "error", text: errorText(prep.error) });

      // 2. The browser sends the file straight to Supabase Storage.
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("artworks")
        .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
      if (upErr) return setMessage({ kind: "error", text: t.uploadFailedError });

      // 3. The server checks the real bytes, then creates the artwork + tags.
      const res = await createArtwork({
        path: prep.path,
        title: String(form.get("title") ?? ""),
        year: String(form.get("year") ?? ""),
        width: String(form.get("width") ?? ""),
        height: String(form.get("height") ?? ""),
        techniqueIds: techniques,
        styleIds: styles,
        presaleEnabled: form.get("presale") === "on",
        originalAvailable: form.get("original") === "on",
        hdAvailable: form.get("hd") === "on",
      });
      if (!res.ok) return setMessage({ kind: "error", text: errorText(res.error) });

      formRef.current?.reset();
      setTechniques([]);
      setStyles([]);
      setMessage({ kind: "ok", text: t.uploadDone });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const techniqueTags = tags.filter((tag) => tag.kind === "technique");
  const styleTags = tags.filter((tag) => tag.kind === "style");
  const tagLabel = (id: string) => {
    const tag = tags.find((x) => x.id === id);
    return tag ? (lang === "fr" ? tag.label_fr : tag.label_en) : "";
  };

  return (
    <div>
      <div className={mono + " text-mid"}>
        {t.artworksLabel} — {artworks.length} / 3 {t.minimumLabel}
      </div>
      <h2 className="mt-3 mb-8 text-2xl md:text-4xl leading-[0.98] tracking-[-0.03em] font-medium">{t.worksAddHeading}</h2>

      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-8 pb-10 mb-10 border-b border-black/8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <label className="flex flex-col gap-2.5 sm:col-span-2">
            <span className={mono + " text-mid"}>{t.fTitle}</span>
            <input type="text" name="title" maxLength={140} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className={mono + " text-mid"}>{t.fYear}</span>
            <input type="number" name="year" min={1900} max={2100} className={fieldClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2.5">
              <span className={mono + " text-mid"}>{t.fWidth}</span>
              <input type="text" inputMode="decimal" name="width" className={fieldClass} />
            </label>
            <label className="flex flex-col gap-2.5">
              <span className={mono + " text-mid"}>{t.fHeight}</span>
              <input type="text" inputMode="decimal" name="height" className={fieldClass} />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-2.5">
          <span className={mono + " text-mid"}>{t.imageFile} — JPEG, PNG, WebP · 25 MB</span>
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
        </label>

        <TagPicker
          kind="technique"
          tags={techniqueTags}
          selected={techniques}
          onToggle={(id) => toggle(techniques, setTechniques, id, LIMITS.technique)}
          onProposed={(tag) => {
            setTags((prev) => (prev.some((x) => x.id === tag.id) ? prev : [...prev, tag]));
            setTechniques((prev) => (prev.length < LIMITS.technique && !prev.includes(tag.id) ? [...prev, tag.id] : prev));
          }}
        />
        <TagPicker
          kind="style"
          tags={styleTags}
          selected={styles}
          onToggle={(id) => toggle(styles, setStyles, id, LIMITS.style)}
          onProposed={(tag) => {
            setTags((prev) => (prev.some((x) => x.id === tag.id) ? prev : [...prev, tag]));
            setStyles((prev) => (prev.length < LIMITS.style && !prev.includes(tag.id) ? [...prev, tag.id] : prev));
          }}
        />

        <div className="flex flex-col gap-3 text-[15px]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="original" className="mt-1 accent-[#0B0B0A]" />
            <span>{t.fOriginalAvailable}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="hd" className="mt-1 accent-[#0B0B0A]" />
            <span>{t.fHdAvailable}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="presale" defaultChecked className="mt-1 accent-[#0B0B0A]" />
            <span>{t.fPresaleDefault}</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <button
            type="submit"
            disabled={busy}
            className="bg-ink text-paper border-0 px-8 py-4 font-mono text-[10px] tracking-[0.18em] uppercase cursor-pointer hover:bg-sanguine disabled:opacity-60"
          >
            {busy ? t.uploadingPending : t.addArtworkCta}
          </button>
          {message && (
            <span role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-sanguine" : "text-ink"}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>

      <div className={mono + " text-mid mb-5"}>
        {t.yourWorks}
      </div>
      <p className="-mt-2 mb-5 text-[13px] text-mid max-w-[70ch]">{t.statsPublicNote}</p>
      {artworks.length === 0 ? (
        <p className="text-mid">{t.noWorksYet}</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black/8 border border-black/8 list-none p-0 m-0">
          {artworks.map((art) => (
            <li key={art.id} className="bg-paper flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL; next/image remote config comes with the public pages */}
              <img src={imageBaseUrl + art.image_path} alt={art.title || t.untitled} className="w-full aspect-[4/3] object-cover bg-white" loading="lazy" />
              <div className="p-4 flex flex-col gap-2.5 flex-1">
                <div className="text-[15px] font-medium truncate">{art.title || t.untitled}</div>
                <div className="text-[13px] text-mid line-clamp-2">{art.tag_ids.map(tagLabel).filter(Boolean).join(" · ")}</div>
                <div className={mono + " text-mid"}>
                  {stats[art.id]?.likes ?? 0} {t.statsLikes} · {stats[art.id]?.wishes ?? 0} {t.statsWishes}
                </div>
                <div className="mt-auto pt-2 flex flex-wrap gap-x-5 gap-y-2">
                  <form action={setPresaleAction.bind(null, art.id, !art.presale_enabled)}>
                    <button type="submit" className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink hover:text-sanguine">
                      {art.presale_enabled ? t.presaleDisableCta : t.presaleEnableCta}
                    </button>
                  </form>
                  <form action={deleteArtworkAction.bind(null, art.id)}>
                    <button type="submit" className="text-[10px] font-mono uppercase tracking-[0.18em] text-mid hover:text-sanguine">
                      {t.deleteCta}
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

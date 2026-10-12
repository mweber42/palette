"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { ARTIST_TERMS, COUNTRIES, EXHIBITION_FREQUENCIES, SPACE_TYPES } from "./taxonomy";
import type { AccountType } from "./types";

// Every action re-reads the logged-in user from the session cookie
// (supabase.auth.getUser()) and never trusts an id sent by the browser.
// The database (RLS + triggers) re-checks everything anyway: these checks
// exist to give clean error messages, not as the security barrier.

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const optional = (v: FormDataEntryValue | null) => str(v) || null;
const inList = (v: string | null, list: Record<string, unknown>) => (v && v in list ? v : null);

function cleanUrl(raw: string): string | undefined {
  if (!raw) return undefined;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function cleanInstagram(raw: string): string | undefined {
  const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : undefined;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface ProfileFormState {
  status: "idle" | "success" | "error";
  error?: string;
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const { supabase, user } = await currentUser();
  if (!user) return { status: "error", error: "not_authenticated" };

  const { data: me } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single<{ account_type: AccountType }>();
  if (!me) return { status: "error", error: "not_found" };

  const display_name = str(formData.get("display_name"));
  if (!display_name) return { status: "error", error: "missing_name" };

  const links: Record<string, string> = {};
  const website = cleanUrl(str(formData.get("website")));
  const instagram = cleanInstagram(str(formData.get("instagram")));
  if (website) links.website = website;
  if (instagram) links.instagram = instagram;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      bio: optional(formData.get("bio")),
      city: optional(formData.get("city")),
      country: inList(optional(formData.get("country")), COUNTRIES),
      links,
    })
    .eq("id", user.id);
  if (error) {
    console.error("updateProfile: profiles update failed", error.message);
    return { status: "error", error: "update_failed" };
  }

  let detailError: { message: string } | null = null;

  if (me.account_type === "artist") {
    ({ error: detailError } = await supabase
      .from("artist_details")
      .update({ open_to_commissions: formData.get("open_to_commissions") === "on" })
      .eq("profile_id", user.id));
    if (!detailError) {
      ({ error: detailError } = await supabase
        .from("artist_private")
        .update({
          rate_range: optional(formData.get("rate_range")),
          print_consent: formData.get("print_consent") === "on",
        })
        .eq("profile_id", user.id));
    }
  } else if (me.account_type === "space") {
    const surface = Number.parseInt(str(formData.get("hanging_surface_m2")), 10);
    ({ error: detailError } = await supabase
      .from("space_details")
      .update({
        space_type: inList(optional(formData.get("space_type")), SPACE_TYPES),
        address_public: optional(formData.get("address_public")),
        hanging_surface_m2: Number.isFinite(surface) && surface >= 0 ? surface : null,
        exhibition_frequency: inList(optional(formData.get("exhibition_frequency")), EXHIBITION_FREQUENCIES),
        artist_terms: inList(optional(formData.get("artist_terms")), ARTIST_TERMS),
      })
      .eq("profile_id", user.id));
  } else if (me.account_type === "member") {
    ({ error: detailError } = await supabase
      .from("member_private")
      .update({
        // "Tell me when works I want come out" now lives in the notification
        // settings (notification_preferences), next to the "En vue" list.
        newsletter_consent: formData.get("newsletter_consent") === "on",
      })
      .eq("profile_id", user.id));
  }

  if (detailError) {
    console.error("updateProfile: details update failed", detailError.message);
    return { status: "error", error: "update_failed" };
  }

  revalidatePath("/account");
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Artwork upload, in three steps (fixes uploads > 1 MB, finding 2026-09-29):
//  1. prepareArtworkUpload — the server creates a one-time signed upload
//     URL in the artist's own folder;
//  2. the BROWSER sends the file straight to Supabase Storage with it (the
//     file never goes through a Server Action, whose body is capped at 1 MB);
//  3. createArtwork — the server checks the real bytes of the stored file,
//     then creates the artwork row and its tags.
// ---------------------------------------------------------------------------

const MAX_BYTES = 25 * 1024 * 1024; // same limit as the bucket (009_v2_storage.sql)
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PrepareUploadResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

export async function prepareArtworkUpload(file: { type: string; size: number }): Promise<PrepareUploadResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return { ok: false, error: "invalid_type" };
  if (!(file.size > 0) || file.size > MAX_BYTES) return { ok: false, error: "too_big" };

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("artworks").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("prepareArtworkUpload: failed", error?.message);
    return { ok: false, error: "upload_failed" };
  }
  return { ok: true, path: data.path, token: data.token };
}

// `file.type` is whatever the browser claims (based on the file name), so we
// check the first bytes of the stored file against known image signatures
// (the 2026-09-29 review found a renamed .pdf passing as .jpg).
function detectImageType(head: Uint8Array): string | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => head[offset + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export interface CreateArtworkInput {
  path: string;
  title: string;
  year: string;
  width: string;
  height: string;
  techniqueIds: string[];
  styleIds: string[];
  presaleEnabled: boolean;
  originalAvailable: boolean;
  hdAvailable: boolean;
}

export type CreateArtworkResult = { ok: true } | { ok: false; error: string };

export async function createArtwork(input: CreateArtworkInput): Promise<CreateArtworkResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const removeUpload = () => supabase.storage.from("artworks").remove([input.path]);

  // The path must be one of OUR uploads in the artist's own folder.
  if (!new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(input.path)) {
    return { ok: false, error: "invalid_path" };
  }
  const techniqueIds = [...new Set(input.techniqueIds)];
  const styleIds = [...new Set(input.styleIds)];
  if (techniqueIds.length < 1 || techniqueIds.length > 3) {
    await removeUpload();
    return { ok: false, error: "techniques_count" };
  }
  if (styleIds.length > 5) {
    await removeUpload();
    return { ok: false, error: "styles_count" };
  }

  // Read only the first 16 bytes of the stored file (HTTP Range request).
  const publicUrl = supabase.storage.from("artworks").getPublicUrl(input.path).data.publicUrl;
  let detected: string | null = null;
  try {
    const res = await fetch(publicUrl, { headers: { Range: "bytes=0-15" }, cache: "no-store" });
    if (res.ok) detected = detectImageType(new Uint8Array(await res.arrayBuffer()).slice(0, 16));
  } catch (e) {
    console.error("createArtwork: could not read uploaded file", e);
  }
  if (!detected) {
    await removeUpload();
    return { ok: false, error: "invalid_type" };
  }

  const num = (v: string) => {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const year = Number.parseInt(input.year, 10);

  const { data: artwork, error: insertError } = await supabase
    .from("artworks")
    .insert({
      artist_id: user.id,
      title: input.title.trim().slice(0, 140),
      year: Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null,
      width_cm: num(input.width),
      height_cm: num(input.height),
      image_path: input.path,
      presale_enabled: input.presaleEnabled,
      original_available: input.originalAvailable,
      hd_file_available: input.hdAvailable,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !artwork) {
    console.error("createArtwork: insert failed", insertError?.message);
    await removeUpload();
    return { ok: false, error: "insert_failed" };
  }

  const { error: tagError } = await supabase
    .from("artwork_tags")
    .insert([...techniqueIds, ...styleIds].map((tag_id) => ({ artwork_id: artwork.id, tag_id })));

  if (tagError) {
    // Roll back: an artwork without its techniques would be half-created.
    console.error("createArtwork: tags insert failed", tagError.message);
    await supabase.from("artworks").delete().eq("id", artwork.id);
    await removeUpload();
    return { ok: false, error: "tags_failed" };
  }

  revalidatePath("/account");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tags proposed by artists (ADR-010): usable right away on their own
// artworks, reviewed by Marine later.
// ---------------------------------------------------------------------------

export type ProposeTagResult =
  | { ok: true; tag: { id: string; kind: string; label_en: string; label_fr: string; status: string } }
  | { ok: false; error: string };

export async function proposeTag(rawLabel: string, kind: "technique" | "style"): Promise<ProposeTagResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  const label = rawLabel.trim().replace(/\s+/g, " ").slice(0, 40);
  if (label.length < 2) return { ok: false, error: "too_short" };

  // The slug is computed by the database (private.slugify); the client
  // value below is a placeholder that the trigger overwrites.
  const { data, error } = await supabase
    .from("tags")
    .insert({ kind: kind === "style" ? "style" : "technique", slug: "pending", label_en: label, label_fr: label })
    .select("id, kind, label_en, label_fr, status")
    .single();

  if (!error && data) return { ok: true, tag: data };

  // Unique slug: the technique may already exist under the same name.
  if (error?.code === "23505") {
    const slug = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const { data: existing } = await supabase
      .from("tags")
      .select("id, kind, label_en, label_fr, status, proposed_by")
      .eq("slug", slug)
      .maybeSingle();
    if (existing && existing.kind === kind && (existing.status === "active" || existing.proposed_by === user.id)) {
      return { ok: true, tag: existing };
    }
    return { ok: false, error: "already_proposed" };
  }
  if (error?.message?.includes("rate_limited")) return { ok: false, error: "rate_limited" };
  console.error("proposeTag: failed", error?.message);
  return { ok: false, error: "propose_failed" };
}

// ---------------------------------------------------------------------------
// Artwork list actions (used as form actions)
// ---------------------------------------------------------------------------

export async function setPresaleAction(artworkId: string, enabled: boolean): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  await supabase.from("artworks").update({ presale_enabled: enabled }).eq("id", artworkId).eq("artist_id", user.id);
  revalidatePath("/account");
}

// No 3-artwork lock any more (ADR-009): going under 3 simply makes the
// profile non-public again until the artist adds one.
export async function deleteArtworkAction(artworkId: string): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;

  // image_path comes from the row ACTUALLY deleted, never from the client
  // (finding 2026-09-29).
  const { data: deleted, error } = await supabase
    .from("artworks")
    .delete()
    .eq("id", artworkId)
    .eq("artist_id", user.id)
    .select("image_path");
  if (error) {
    console.error("deleteArtwork: failed", error.message);
    return;
  }
  const path = deleted?.[0]?.image_path;
  if (path) await supabase.storage.from("artworks").remove([path]);
  revalidatePath("/account");
}

// ---------------------------------------------------------------------------
// "I want it" → the "En vue" list (ADR-002, review 2026-10-12): one click, no
// format, no payment. The user is told when the print comes out (in-app,
// plus email / SMS if they asked for it in their notification settings).
// ---------------------------------------------------------------------------

export type WantResult = { ok: true; title: string; already: boolean } | { ok: false; error: string };

export async function wantArtwork(artworkId: string): Promise<WantResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: art } = await supabase.from("artworks").select("id, title").eq("id", artworkId).maybeSingle();
  if (!art) return { ok: false, error: "not_found" };

  const { error } = await supabase.from("purchase_intents").insert({ user_id: user.id, artwork_id: artworkId });
  if (error && error.code !== "23505") {
    console.error("wantArtwork: failed", error.message);
    return { ok: false, error: "want_failed" };
  }
  revalidatePath("/account");
  return { ok: true, title: art.title, already: error?.code === "23505" };
}

export async function removeFromWatchlistAction(intentId: string): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  await supabase.from("purchase_intents").update({ status: "cancelled" }).eq("id", intentId).eq("user_id", user.id);
  revalidatePath("/account");
}

export interface NotifPrefsState {
  status: "idle" | "success" | "error";
  error?: string;
}

export async function updateNotificationPreferences(
  _prev: NotifPrefsState,
  formData: FormData
): Promise<NotifPrefsState> {
  const { supabase, user } = await currentUser();
  if (!user) return { status: "error", error: "not_authenticated" };
  const email = formData.get("notify_email") === "on";
  const sms = formData.get("notify_sms") === "on";
  const phone = str(formData.get("phone")) || null;
  if (sms && (!phone || !/^\+?[0-9 .-]{6,20}$/.test(phone))) return { status: "error", error: "phone_required" };

  const { error } = await supabase
    .from("notification_preferences")
    .update({ email, sms, phone })
    .eq("profile_id", user.id);
  if (error) {
    console.error("updateNotificationPreferences: failed", error.message);
    return { status: "error", error: "update_failed" };
  }
  revalidatePath("/account");
  return { status: "success" };
}

export async function markNotificationsReadAction(): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/account");
}

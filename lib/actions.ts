"use server";

import { supabase } from "./supabase";

export interface ApplyState {
  status: "idle" | "success" | "error";
  firstName?: string;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitApplication(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const portfolio = String(formData.get("portfolio") || "").trim();
  const medium = String(formData.get("medium") || "").trim();
  const place = String(formData.get("place") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const lang = String(formData.get("lang") || "en").trim();

  if (!name || !email || !EMAIL_RE.test(email)) {
    return { status: "error", error: "invalid_input" };
  }

  if (!supabase) {
    // Supabase isn't configured yet (no .env.local) — fail loudly instead of
    // silently pretending the application was saved.
    console.error("submitApplication: Supabase is not configured (missing env vars)");
    return { status: "error", error: "not_configured" };
  }

  const { error } = await supabase.from("artist_applications").insert({
    name,
    email,
    portfolio: portfolio || null,
    medium: medium || null,
    place: place || null,
    bio: bio || null,
    lang,
  });

  if (error) {
    console.error("submitApplication: insert failed", error.message);
    return { status: "error", error: "insert_failed" };
  }

  return { status: "success", firstName: name.split(" ")[0] || "" };
}

export interface SubscribeState {
  status: "idle" | "success" | "error";
}

export async function subscribeNewsletter(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const email = String(formData.get("email") || "").trim();
  if (!email || !EMAIL_RE.test(email)) return { status: "error" };

  if (!supabase) {
    console.error("subscribeNewsletter: Supabase is not configured (missing env vars)");
    return { status: "error" };
  }

  const { error } = await supabase.from("newsletter_subscribers").insert({ email });
  // Duplicate email (already subscribed) shouldn't read as an error to the user.
  if (error && error.code !== "23505") {
    console.error("subscribeNewsletter: insert failed", error.message);
    return { status: "error" };
  }

  return { status: "success" };
}

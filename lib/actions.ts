"use server";

import { supabase } from "./supabase";

// The anonymous artist application (submitApplication) was retired in v2:
// artists now create a real account (/join). Past submissions stay in the
// artist_applications table.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

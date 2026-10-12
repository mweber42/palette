"use server";

import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getFlags } from "./flags";
import type { SignupAccountType } from "./types";

export interface AuthState {
  status: "idle" | "error" | "check_email";
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIGNUP_TYPES: readonly SignupAccountType[] = ["artist", "space", "member"];
function isSignupType(value: string): value is SignupAccountType {
  return (SIGNUP_TYPES as readonly string[]).includes(value);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const accountType = String(formData.get("account_type") || "");
  const name = String(formData.get("name") || "").trim();
  const lang = formData.get("lang") === "fr" ? "fr" : "en";

  if (!email || !EMAIL_RE.test(email)) return { status: "error", error: "invalid_email" };
  if (password.length < 8) return { status: "error", error: "weak_password" };
  if (!isSignupType(accountType)) return { status: "error", error: "invalid_account_type" };
  if (!name) return { status: "error", error: "missing_name" };

  // The database refuses an organization signup while its flag is off; this
  // check gives the same answer earlier, with a clean error message.
  const flags = await getFlags();
  const allowed =
    (accountType === "artist" && flags.artist_accounts) ||
    (accountType === "space" && flags.spaces) ||
    (accountType === "member" && flags.member_accounts);
  if (!allowed) return { status: "error", error: "invalid_account_type" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the `handle_new_user` trigger (supabase/005_v2_core.sql),
    // which creates the profile and its per-type rows.
    options: { data: { account_type: accountType, name, lang } },
  });

  if (error) {
    console.error("signUp: failed", error.message);
    return { status: "error", error: "signup_failed" };
  }

  if (!data.session) {
    // Email confirmation is enabled by default on Supabase — no session
    // until the link received by email has been clicked.
    return { status: "check_email" };
  }

  redirect("/account");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !EMAIL_RE.test(email)) return { status: "error", error: "invalid_email" };
  if (!password) return { status: "error", error: "missing_password" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("signIn: failed", error.message);
    return { status: "error", error: "signin_failed" };
  }

  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

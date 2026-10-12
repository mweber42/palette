import { redirect } from "next/navigation";
import SignupView from "@/components/SignupView";
import type { SignupAccountType } from "@/lib/types";

const TYPES: readonly SignupAccountType[] = ["artist", "space", "member"];

// Server Component: reads ?type= and sends anyone without a valid type back
// to /join to choose one. The translated rendering lives in SignupView
// (client), the same split as /account.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (!type || !(TYPES as readonly string[]).includes(type)) redirect("/join");
  return <SignupView accountType={type as SignupAccountType} />;
}

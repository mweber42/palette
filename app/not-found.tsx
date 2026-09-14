import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-[960px] mx-auto px-5 md:px-18 pt-[160px] pb-40 text-center">
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-mid">404</div>
      <p className="mt-4 text-2xl">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="font-mono text-[10px] tracking-[0.18em] uppercase inline-block mt-8 border border-black/8 px-6 py-3 hover:border-sanguine hover:text-sanguine transition-colors"
      >
        Back home
      </Link>
    </div>
  );
}

// Small shared Tailwind class fragments so the "Gallery Grid" system (tiny
// tracked-out mono labels, hairline dividers, sanguine hover) stays
// consistent across every component instead of being retyped everywhere.

export const mono =
  "font-mono text-[10px] leading-none tracking-[0.18em] uppercase";

export const monoMid = `${mono} text-mid`;

export const hairlineGrid =
  "grid gap-px bg-black/8 border border-black/8";

export const linkHover =
  "transition-colors duration-300 hover:text-sanguine";

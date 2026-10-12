import type { Lang } from "./types";

// Bilingual labels for the fixed value lists of the v2 schema. The values
// (keys) must match the CHECK constraints in supabase/005_v2_core.sql.
// Tags (techniques/styles) are NOT here: they live in the `tags` table so
// Marine can edit them without a deploy.

type Labels = Record<string, Record<Lang, string>>;

export const SPACE_TYPES: Labels = {
  gallery: { en: "Gallery", fr: "Galerie" },
  popup: { en: "Pop-up gallery", fr: "Galerie éphémère" },
  studio: { en: "Studio / collective", fr: "Atelier / collectif" },
  residency: { en: "Artist residency", fr: "Résidence d'artistes" },
  print_workshop: { en: "Print workshop / framer", fr: "Atelier d'impression / encadreur" },
  cultural_venue: { en: "Art centre / third place", fr: "Centre d'art / tiers-lieu" },
  hospitality: { en: "Café, restaurant, hotel", fr: "Café, restaurant, hôtel" },
  retail: { en: "Concept store / bookshop", fr: "Concept store / librairie" },
  workplace: { en: "Coworking / offices", fr: "Coworking / bureaux" },
  event: { en: "Festival, fair, event", fr: "Festival, salon, événement" },
  public_space: { en: "Public space / mural wall", fr: "Espace public / mur" },
  institution: { en: "Hospital, school, institution", fr: "Hôpital, école, institution" },
  other: { en: "Other", fr: "Autre" },
};

export const EXHIBITION_FREQUENCIES: Labels = {
  ongoing: { en: "All year round", fr: "Toute l'année" },
  monthly: { en: "Every month", fr: "Chaque mois" },
  quarterly: { en: "Every quarter", fr: "Chaque trimestre" },
  yearly: { en: "Once a year", fr: "Une fois par an" },
  occasional: { en: "Occasionally", fr: "Ponctuellement" },
};

// No value lets a space charge the artist (ADR-004).
export const ARTIST_TERMS: Labels = {
  paid_fee: { en: "A fee", fr: "Une rémunération" },
  sales_commission: { en: "Sales, minus a commission", fr: "Les ventes, moins une commission" },
  free_for_artist: { en: "Free exhibition, artist keeps all sales", fr: "Exposition gratuite, l'artiste garde tout" },
};

export const COUNTRIES: Labels = {
  FR: { en: "France", fr: "France" },
  BE: { en: "Belgium", fr: "Belgique" },
  LU: { en: "Luxembourg", fr: "Luxembourg" },
  DE: { en: "Germany", fr: "Allemagne" },
  CH: { en: "Switzerland", fr: "Suisse" },
  ES: { en: "Spain", fr: "Espagne" },
  IT: { en: "Italy", fr: "Italie" },
  NL: { en: "Netherlands", fr: "Pays-Bas" },
  GB: { en: "United Kingdom", fr: "Royaume-Uni" },
  CA: { en: "Canada", fr: "Canada" },
  US: { en: "United States", fr: "États-Unis" },
};

export function label(list: Labels, key: string | null | undefined, lang: Lang): string {
  if (!key) return "";
  return list[key]?.[lang] ?? key;
}

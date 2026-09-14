import type { Artist, Artwork, Lang } from "./types";

// Ported from the Palette Claude Design mockup (Palette.dc.html) so the real
// app starts from the exact same content. Swap this file for a real CMS/DB
// query later — every component consumes these through the helpers below,
// not the arrays directly, so that swap only touches this file.

export const CATS: Record<string, Record<Lang, string>> = {
  Photography: { en: "Photography", fr: "Photographie" },
  Illustration: { en: "Illustration", fr: "Illustration" },
  Painting: { en: "Painting", fr: "Peinture" },
  "Graphic Design": { en: "Graphic Design", fr: "Design graphique" },
  "Mixed Media": { en: "Mixed Media", fr: "Techniques mixtes" },
};

export const MEDIUMS: Record<string, Record<Lang, string>> = {
  "Giclée print": { en: "Giclée print", fr: "Tirage giclée" },
  "Riso print": { en: "Riso print", fr: "Tirage riso" },
  "Oil on linen, print": { en: "Oil on linen, print", fr: "Huile sur lin, tirage" },
  "Offset print": { en: "Offset print", fr: "Tirage offset" },
  "Collage, print": { en: "Collage, print", fr: "Collage, tirage" },
};

export const ARTISTS: Artist[] = [
  {
    id: "a1", slug: "mira-halvorsen", name: "Mira Halvorsen", location: "Lofoten, NO", medium: "Photography",
    bio: {
      en: "Working from a converted fish shed in Lofoten, Mira photographs the ten minutes of light that arrive after a storm. Each print is produced from a single exposure — no composites.",
      fr: "Depuis un ancien hangar à poissons des Lofoten, Mira photographie les dix minutes de lumière qui suivent la tempête. Chaque tirage provient d'une seule prise — aucun montage.",
    },
  },
  {
    id: "a2", slug: "kwame-otieno", name: "Kwame Otieno", location: "Nairobi, KE", medium: "Illustration",
    bio: {
      en: "Riso-led illustration built from fragments of Nairobi signwriting. Kwame draws by hand, then separates colour by eye rather than software.",
      fr: "Une illustration au riso composée de fragments d'enseignes peintes de Nairobi. Kwame dessine à la main, puis sépare les couleurs à l'œil, sans logiciel.",
    },
  },
  {
    id: "a3", slug: "sofia-brandt", name: "Sofia Brandt", location: "Copenhagen, DK", medium: "Painting",
    bio: {
      en: "Oil on linen, mostly interiors at dusk. Sofia paints the same three rooms repeatedly, looking for the version where the light finally behaves.",
      fr: "Huile sur lin, surtout des intérieurs au crépuscule. Sofia peint sans cesse les mêmes trois pièces, en quête de la version où la lumière se tient enfin.",
    },
  },
  {
    id: "a4", slug: "renzo-aoki", name: "Renzo Aoki", location: "Tokyo, JP", medium: "Graphic Design",
    bio: {
      en: "Grid studies and typographic posters made in a 4m² studio in Setagaya. Renzo restricts each series to two inks.",
      fr: "Études de grille et affiches typographiques réalisées dans un atelier de 4 m² à Setagaya. Renzo limite chaque série à deux encres.",
    },
  },
  {
    id: "a5", slug: "amara-diallo", name: "Amara Diallo", location: "Dakar, SN", medium: "Mixed Media",
    bio: {
      en: "Collage on found paper — bus tickets, ledgers, weather charts — assembled into architectural forms that never existed.",
      fr: "Collage sur papiers trouvés — tickets de bus, registres, cartes météo — assemblés en architectures qui n'ont jamais existé.",
    },
  },
  {
    id: "a6", slug: "elin-vasquez", name: "Elin Vásquez", location: "Valparaíso, CL", medium: "Photography",
    bio: {
      en: "Long-exposure coastal work shot on 4×5 film. Elin waits, sometimes for days, and returns with one frame.",
      fr: "Longues expositions du littoral sur film 4×5. Elin attend, parfois des jours, et revient avec une seule image.",
    },
  },
];

export const ARTWORKS: Artwork[] = [
  { id: "w1", slug: "northern-field-no-4", title: "Northern Field, No. 4", category: "Photography", artistId: "a1", price: "€180", dimensions: "70 × 100 cm", medium: "Giclée print" },
  { id: "w2", slug: "storm-index", title: "Storm Index", category: "Photography", artistId: "a1", price: "€150", dimensions: "50 × 70 cm", medium: "Giclée print" },
  { id: "w3", slug: "three-signs-for-a-kiosk", title: "Three Signs for a Kiosk", category: "Illustration", artistId: "a2", price: "€120", dimensions: "50 × 70 cm", medium: "Riso print" },
  { id: "w4", slug: "matatu-hymn", title: "Matatu Hymn", category: "Illustration", artistId: "a2", price: "€135", dimensions: "60 × 80 cm", medium: "Riso print" },
  { id: "w5", slug: "interior-with-late-sun", title: "Interior with Late Sun", category: "Painting", artistId: "a3", price: "€260", dimensions: "70 × 90 cm", medium: "Oil on linen, print" },
  { id: "w6", slug: "blue-room-vi", title: "Blue Room VI", category: "Painting", artistId: "a3", price: "€240", dimensions: "60 × 80 cm", medium: "Oil on linen, print" },
  { id: "w7", slug: "two-ink-grid", title: "Two-Ink Grid", category: "Graphic Design", artistId: "a4", price: "€95", dimensions: "50 × 70 cm", medium: "Offset print" },
  { id: "w8", slug: "setagaya-schedule", title: "Setagaya Schedule", category: "Graphic Design", artistId: "a4", price: "€95", dimensions: "50 × 70 cm", medium: "Offset print" },
  { id: "w9", slug: "ledger-tower", title: "Ledger Tower", category: "Mixed Media", artistId: "a5", price: "€210", dimensions: "70 × 100 cm", medium: "Collage, print" },
  { id: "w10", slug: "weather-for-a-city", title: "Weather for a City", category: "Mixed Media", artistId: "a5", price: "€190", dimensions: "60 × 80 cm", medium: "Collage, print" },
  { id: "w11", slug: "pacific-long-hold", title: "Pacific, Long Hold", category: "Photography", artistId: "a6", price: "€200", dimensions: "70 × 100 cm", medium: "Giclée print" },
  { id: "w12", slug: "salt-study-02", title: "Salt Study 02", category: "Photography", artistId: "a6", price: "€165", dimensions: "50 × 70 cm", medium: "Giclée print" },
];

export const pad = (n: number) => String(n + 1).padStart(2, "0");

export function catLabel(key: string, lang: Lang) {
  return CATS[key]?.[lang] ?? key;
}

export function mediumLabel(key: string, lang: Lang) {
  return MEDIUMS[key]?.[lang] ?? key;
}

export function artistBySlug(slug: string) {
  return ARTISTS.find((a) => a.slug === slug);
}

export function artworkBySlug(slug: string) {
  return ARTWORKS.find((w) => w.slug === slug);
}

export function worksByArtist(artistId: string) {
  return ARTWORKS.filter((w) => w.artistId === artistId);
}

export function relatedWorks(artwork: Artwork, limit = 4) {
  const sameArtist = ARTWORKS.filter((w) => w.artistId === artwork.artistId && w.slug !== artwork.slug);
  const sameCategory = ARTWORKS.filter((w) => w.category === artwork.category && w.artistId !== artwork.artistId);
  return [...sameArtist, ...sameCategory].slice(0, limit);
}

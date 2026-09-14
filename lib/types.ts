export type Lang = "en" | "fr";

export interface Artist {
  id: string;
  slug: string;
  name: string;
  location: string;
  medium: string; // key into CATS
  bio: { en: string; fr: string };
}

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  category: string; // key into CATS
  artistId: string;
  price: string;
  dimensions: string;
  medium: string; // key into MEDIUMS
}

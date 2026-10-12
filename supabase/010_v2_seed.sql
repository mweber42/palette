-- supabase/010_v2_seed.sql
-- Palette v2 — step 7 of 7: starting data (flags, settings, formats, tags).
-- Safe to re-run: every insert ignores rows that already exist, so it
-- never overwrites a value Marine changed later from the admin.

-- Feature flags — launch state, "Community" phase (spec §8).
insert into public.feature_flags (key, enabled, description) values
  ('artist_accounts',       true,  'Artists can sign up'),
  ('member_accounts',       true,  'Art lovers (members) can sign up'),
  ('spaces',                true,  'Space profiles and the Spaces directory'),
  ('likes',                 true,  'Like artworks'),
  ('share',                 true,  'Share buttons'),
  ('collections',           true,  'Private collections'),
  ('presale_intents',       true,  '"I want it" purchase intents (no payment)'),
  ('journal',               true,  'Journal / Accrochage pages'),
  ('founding_member_badge', true,  'Founding member badge on profiles'),
  ('demo_content',          true,  'Show demo artists until real profiles exist'),
  ('organization_accounts', false, 'Organizations can sign up (opened later, all at once)'),
  ('opportunities',         false, 'Paid opportunities board (opened later, all at once)'),
  ('contact_requests',      false, 'Contact requests relayed by email'),
  ('reco_embeddings',       false, 'Visual-embedding recommendations (v1)'),
  ('messaging',             false, 'Not built'),
  ('print_sales',           false, 'Not built'),
  ('paid_plans',            false, 'Not built')
on conflict (key) do nothing;

insert into public.app_settings (key, value) values
  ('feed.discovery_ratio', '0.3'::jsonb)
on conflict (key) do nothing;

-- Print formats — prices deliberately NULL until Marine confirms them.
insert into public.print_formats (code, label, sort_order) values
  ('A4',    'A4 — 21 × 29.7 cm', 10),
  ('A3',    'A3 — 29.7 × 42 cm', 20),
  ('30x40', '30 × 40 cm',        30),
  ('50x70', '50 × 70 cm',        40)
on conflict (code) do nothing;

-- Tags — starting list (spec §3.4 bis), to be adjusted by Marine.
insert into public.tags (kind, slug, label_en, label_fr) values
  ('technique', 'digital-illustration', 'Digital illustration', 'Illustration numérique'),
  ('technique', 'digital-painting',     'Digital painting',     'Peinture numérique'),
  ('technique', 'watercolor',           'Watercolor',           'Aquarelle'),
  ('technique', 'gouache',              'Gouache',              'Gouache'),
  ('technique', 'acrylic',              'Acrylic',              'Acrylique'),
  ('technique', 'oil',                  'Oil',                  'Huile'),
  ('technique', 'ink',                  'Ink',                  'Encre'),
  ('technique', 'pencil-graphite',      'Pencil / graphite',    'Crayon / graphite'),
  ('technique', 'charcoal',             'Charcoal',             'Fusain'),
  ('technique', 'pastel',               'Pastel',               'Pastel'),
  ('technique', 'marker',               'Marker',               'Feutre'),
  ('technique', 'engraving',            'Engraving',            'Gravure'),
  ('technique', 'linocut',              'Linocut',              'Linogravure'),
  ('technique', 'screen-printing',      'Screen printing',      'Sérigraphie'),
  ('technique', 'risograph',            'Risograph',            'Risographie'),
  ('technique', 'lithography',          'Lithography',          'Lithographie'),
  ('technique', 'film-photography',     'Film photography',     'Photographie argentique'),
  ('technique', 'digital-photography',  'Digital photography',  'Photographie numérique'),
  ('technique', 'collage',              'Collage',              'Collage'),
  ('technique', 'mixed-media',          'Mixed media',          'Techniques mixtes'),
  ('technique', 'mural-street-art',     'Mural / street art',   'Art mural / street art'),
  ('technique', 'typography-lettering', 'Typography / lettering','Typographie / lettering'),
  ('technique', 'embroidery-textile',   'Embroidery / textile', 'Broderie / textile'),
  ('style', 'abstract',        'Abstract',              'Abstrait'),
  ('style', 'figurative',      'Figurative',            'Figuratif'),
  ('style', 'minimalist',      'Minimalist',            'Minimaliste'),
  ('style', 'geometric',       'Geometric',             'Géométrique'),
  ('style', 'botanical',       'Botanical',             'Botanique'),
  ('style', 'landscape',       'Landscape',             'Paysage'),
  ('style', 'portrait',        'Portrait',              'Portrait'),
  ('style', 'still-life',      'Still life',            'Nature morte'),
  ('style', 'architecture',    'Architecture',          'Architecture'),
  ('style', 'surreal',         'Surreal',               'Surréaliste'),
  ('style', 'dreamlike',       'Dreamlike',             'Onirique'),
  ('style', 'pop',             'Pop',                   'Pop'),
  ('style', 'retro-vintage',   'Retro / vintage',       'Rétro / vintage'),
  ('style', 'naive',           'Naive',                 'Naïf'),
  ('style', 'typographic',     'Typographic',           'Typographique'),
  ('style', 'urban',           'Urban',                 'Urbain'),
  ('style', 'black-and-white', 'Black and white',       'Noir et blanc'),
  ('style', 'colorful',        'Colorful',              'Très coloré'),
  ('style', 'humorous',        'Humorous',              'Humoristique'),
  ('style', 'scientific',      'Scientific / naturalist','Scientifique / naturaliste')
on conflict (slug) do nothing;

// supabase/tests/rls.test.mjs
// Runs every migration on a throwaway local Postgres (PGlite, in memory),
// then checks the security rules (RLS) and business rules by acting as
// different users — exactly like requests sent straight to the Supabase
// API, bypassing the website. Run with: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sql = (f) => readFileSync(join(here, "..", f), "utf8");

const db = new PGlite();
let passed = 0;
let failed = 0;

async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e.message}`);
  } finally {
    await asSystem();
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function asSystem() {
  await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
}
async function asAnon() {
  await db.exec(`select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;`);
}
async function asUser(id) {
  const claims = JSON.stringify({ role: "authenticated", sub: id });
  await db.exec(`select set_config('request.jwt.claims', '${claims}', false); set role authenticated;`);
}
async function q(text, params) {
  return (await db.query(text, params)).rows;
}
async function fails(text, params, expected) {
  try {
    await db.query(text, params);
  } catch (e) {
    if (expected && !e.message.includes(expected)) {
      throw new Error(`failed with "${e.message}", expected "${expected}"`);
    }
    return;
  }
  throw new Error(`should have failed: ${text}`);
}

async function signup(email, accountType, name) {
  const meta = JSON.stringify({ account_type: accountType, name, lang: "fr" });
  const [u] = await q(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, meta]
  );
  return u.id;
}
async function addArtwork(artistId, title, techniqueSlugs = [], styleSlugs = []) {
  await asUser(artistId);
  const [a] = await q(
    `insert into public.artworks (artist_id, title, image_path)
     values ($1, $2, $3) returning id`,
    [artistId, title, `${artistId}/${title}.jpg`]
  );
  for (const s of [...techniqueSlugs, ...styleSlugs]) {
    await q(`insert into public.artwork_tags (artwork_id, tag_id)
             select $1, id from public.tags where slug = $2`, [a.id, s]);
  }
  await asSystem();
  return a.id;
}

// ---------------------------------------------------------------------------
console.log("Applying migrations…");
for (const f of [
  "tests/supabase-stubs.sql",
  "schema.sql",
  "004_v2_reset.sql",
  "005_v2_core.sql",
  "006_v2_engagement.sql",
  "007_v2_opportunities.sql",
  "008_v2_editorial.sql",
  "009_v2_storage.sql",
  "010_v2_seed.sql",
  "010_v2_seed.sql", // re-run on purpose: must be idempotent
]) {
  await db.exec(sql(f));
}
console.log("Migrations applied.\n");

const lea = await signup("lea@test.fr", "artist", "Léa Martin");
const tom = await signup("tom@test.fr", "artist", "Tom Durand");
const karim = await signup("karim@test.fr", "space", "Café Karim");
const sophie = await signup("sophie@test.fr", "member", "Sophie");
const admin = await signup("marine@test.fr", "member", "Marine");
await q(`insert into public.admins (user_id) values ($1)`, [admin]);

console.log("Signup");
await step("profiles + per-type rows are created at signup", async () => {
  const rows = await q(`select account_type, handle, is_published from public.profiles order by created_at`);
  assert(rows.length === 5, `expected 5 profiles, got ${rows.length}`);
  const p = (await q(`select handle from public.profiles where id = $1`, [lea]))[0];
  assert(/^lea-martin-[a-z0-9]{5}$/.test(p.handle), `bad handle ${p.handle}`);
  assert((await q(`select 1 from public.artist_details where profile_id=$1`, [lea])).length === 1, "no artist_details");
  assert((await q(`select 1 from public.artist_private where profile_id=$1`, [lea])).length === 1, "no artist_private");
  assert((await q(`select 1 from public.space_details where profile_id=$1`, [karim])).length === 1, "no space_details");
  assert((await q(`select 1 from public.member_private where profile_id=$1`, [sophie])).length === 1, "no member_private");
  assert((await q(`select 1 from public.profile_moderation where profile_id=$1`, [sophie])).length === 0, "member must have no moderation row");
});
await step("organization signup refused while its flag is off", async () => {
  await fails(`insert into auth.users (email, raw_user_meta_data)
               values ('org@test.fr', '{"account_type":"organization","name":"Agence"}')`, [],
    "organization_accounts_disabled");
});
await step("unknown account type refused", async () => {
  await fails(`insert into auth.users (email, raw_user_meta_data)
               values ('x@test.fr', '{"account_type":"admin","name":"X"}')`, [], "invalid_account_type");
});

console.log("Publication (ADR-009: automatic when complete)");
const w1 = await addArtwork(lea, "Nuit", ["linocut"], ["botanical", "black-and-white"]);
const w2 = await addArtwork(lea, "Aube", ["linocut"], ["botanical"]);
await step("artist with 2 artworks is not public", async () => {
  const [p] = await q(`select is_published from public.profiles where id=$1`, [lea]);
  assert(p.is_published === false, "should not be published yet");
});
const w3 = await addArtwork(lea, "Midi", ["watercolor"], ["landscape"]);
await step("artist with 3 artworks + a technique becomes public", async () => {
  const [p] = await q(`select is_published, first_published_at from public.profiles where id=$1`, [lea]);
  assert(p.is_published === true, "should be published");
  assert(p.first_published_at !== null, "first_published_at not set");
});
await step("3 artworks but no technique tag -> not public", async () => {
  await addArtwork(tom, "A", [], ["abstract"]);
  await addArtwork(tom, "B", [], ["abstract"]);
  await addArtwork(tom, "C", [], ["geometric"]);
  const [p] = await q(`select is_published from public.profiles where id=$1`, [tom]);
  assert(p.is_published === false, "should need a technique");
  const [a] = await q(`select id from public.artworks where artist_id=$1 limit 1`, [tom]);
  await asUser(tom);
  await q(`insert into public.artwork_tags (artwork_id, tag_id) select $1, id from public.tags where slug='acrylic'`, [a.id]);
  await asSystem();
  const [p2] = await q(`select is_published from public.profiles where id=$1`, [tom]);
  assert(p2.is_published === true, "should be published once a technique is added");
});
await step("space public once type + city are set", async () => {
  await asUser(karim);
  await q(`update public.profiles set city='Strasbourg' where id=$1`, [karim]);
  await q(`update public.space_details set space_type='hospitality' where profile_id=$1`, [karim]);
  await asSystem();
  const [p] = await q(`select is_published from public.profiles where id=$1`, [karim]);
  assert(p.is_published === true, "space should be published");
});
await step("member is never public", async () => {
  await asUser(sophie);
  await q(`update public.profiles set city='Metz', display_name='Sophie L.' where id=$1`, [sophie]);
  await asSystem();
  const [p] = await q(`select is_published from public.profiles where id=$1`, [sophie]);
  assert(p.is_published === false, "member must stay private");
});
await step("going under 3 artworks unpublishes (no blocking)", async () => {
  await asUser(lea);
  const extra = await q(`insert into public.artworks (artist_id, title, image_path)
                         values ($1, 'Tmp', 'x/tmp.jpg') returning id`, [lea]);
  await q(`delete from public.artworks where id=$1`, [extra[0].id]);
  await q(`delete from public.artworks where id=$1`, [w3]);
  await asSystem();
  let [p] = await q(`select is_published from public.profiles where id=$1`, [lea]);
  assert(p.is_published === false, "should be unpublished under 3");
  await addArtwork(lea, "Midi bis", ["watercolor"], ["landscape"]);
  [p] = await q(`select is_published from public.profiles where id=$1`, [lea]);
  assert(p.is_published === true, "should be republished");
});

console.log("Protected fields and ownership");
await step("owner cannot change account_type / founding_member / plan / is_published", async () => {
  await asUser(sophie);
  await q(`update public.profiles set account_type='artist', founding_member=true, plan='pro', is_published=true where id=$1`, [sophie]);
  await asSystem();
  const [p] = await q(`select account_type, founding_member, plan, is_published from public.profiles where id=$1`, [sophie]);
  assert(p.account_type === "member" && !p.founding_member && p.plan === "free" && !p.is_published,
    `protected fields changed: ${JSON.stringify(p)}`);
});
await step("user cannot update someone else's profile", async () => {
  await asUser(sophie);
  await q(`update public.profiles set display_name='hacked' where id=$1`, [lea]);
  await asSystem();
  const [p] = await q(`select display_name from public.profiles where id=$1`, [lea]);
  assert(p.display_name === "Léa Martin", "profile was modified by another user");
});
await step("invalid handle refused", async () => {
  await asUser(lea);
  await fails(`update public.profiles set handle='Bad Handle!' where id=$1`, [lea], "check");
});
await step("member cannot create an artwork", async () => {
  await asUser(sophie);
  await fails(`insert into public.artworks (artist_id, title, image_path)
               values ($1, 'x', 'x.jpg')`, [sophie], "row-level security");
});
await step("\"I want it\" is on by default for a new artwork", async () => {
  const [a] = await q(`select presale_enabled from public.artworks where id=$1`, [w1]);
  assert(a.presale_enabled === true, "presale should default to on");
});
await step("artist cannot hide/unhide via review_status nor move artwork", async () => {
  await asUser(lea);
  await q(`update public.artworks set review_status='hidden', artist_id=$2 where id=$1`, [w1, tom]);
  await asSystem();
  const [a] = await q(`select review_status, artist_id from public.artworks where id=$1`, [w1]);
  assert(a.review_status === "live" && a.artist_id === lea, "protected artwork fields changed");
});

console.log("Visibility (what the public API exposes)");
await step("anon sees published profiles only", async () => {
  await asAnon();
  const rows = await q(`select id from public.profiles`);
  const ids = rows.map((r) => r.id);
  assert(ids.includes(lea) && ids.includes(karim), "published profiles missing");
  assert(!ids.includes(sophie) && !ids.includes(admin), "member profiles leaked");
});
await step("anon cannot read private tables", async () => {
  await asAnon();
  for (const t of ["artist_private", "member_private", "profile_moderation", "admins", "likes", "purchase_intents", "organization_private"]) {
    const rows = await q(`select * from public.${t}`).catch(() => []);
    assert(rows.length === 0, `anon can read ${t}`);
  }
});
await step("other users cannot read someone's private rows", async () => {
  await asUser(sophie);
  assert((await q(`select * from public.artist_private`)).length === 0, "artist_private leaked");
  assert((await q(`select * from public.profile_moderation`)).length === 0, "moderation leaked");
  await asUser(lea);
  assert((await q(`select * from public.artist_private`)).length === 1, "owner can't read own private row");
});
await step("anon reads artworks, tags and details of published artists", async () => {
  await asAnon();
  assert((await q(`select * from public.artworks where artist_id=$1`, [lea])).length === 3, "artworks not visible");
  assert((await q(`select * from public.artwork_tags`)).length > 0, "artwork tags not visible");
  assert((await q(`select * from public.artist_details where profile_id=$1`, [lea])).length === 1, "details not visible");
  assert((await q(`select * from public.artist_tags_summary where artist_id=$1`, [lea])).length > 0, "tag summary empty");
});

console.log("Tags (ADR-010)");
await step("max 3 techniques per artwork", async () => {
  await asUser(lea);
  await q(`insert into public.artwork_tags select $1, id from public.tags where slug in ('ink','gouache')`, [w1]);
  await fails(`insert into public.artwork_tags select $1, id from public.tags where slug='pastel'`, [w1], "too_many_techniques");
});
await step("max 5 styles per artwork", async () => {
  await asUser(lea);
  await q(`insert into public.artwork_tags select $1, id from public.tags where slug in ('minimalist','dreamlike','surreal')`, [w1]);
  await fails(`insert into public.artwork_tags select $1, id from public.tags where slug='pop'`, [w1], "too_many_styles");
});
await step("artist proposes a tag: forced to 'proposed', usable only by them", async () => {
  await asUser(lea);
  await q(`insert into public.tags (kind, slug, label_en, label_fr, status)
           values ('technique', 'whatever', 'Cyanotype', 'Cyanotype', 'active')`);
  await asSystem();
  const [t] = await q(`select status, proposed_by, slug from public.tags where label_en='Cyanotype'`);
  assert(t.status === "proposed" && t.proposed_by === lea && t.slug === "cyanotype", JSON.stringify(t));
  await asUser(lea);
  await q(`insert into public.artwork_tags select $1, id from public.tags where slug='cyanotype'`, [w2]);
  await asUser(tom);
  const [tw] = await q(`select id from public.artworks where artist_id=$1 limit 1`, [tom]);
  await fails(`insert into public.artwork_tags select $1, id from public.tags where slug='cyanotype'`, [tw.id], "tag_not_available");
});
await step("member cannot propose tags; nobody but admins edits tags", async () => {
  await asUser(sophie);
  await fails(`insert into public.tags (kind, slug, label_en, label_fr) values ('style','x','X','X')`, [], "row-level security");
  await asUser(lea);
  await q(`update public.tags set label_en='Hacked' where slug='watercolor'`);
  await asSystem();
  const [t] = await q(`select label_en from public.tags where slug='watercolor'`);
  assert(t.label_en === "Watercolor", "tag edited by non-admin");
});

console.log("Likes, intents, stats");
await step("member likes a visible artwork; artist cannot like own", async () => {
  await asUser(sophie);
  await q(`insert into public.likes (user_id, artwork_id) values ($1, $2)`, [sophie, w1]);
  await asUser(lea);
  await fails(`insert into public.likes (user_id, artwork_id) values ($1, $2)`, [lea, w1], "row-level security");
});
await step("likes are private (no public counts)", async () => {
  await asUser(tom);
  assert((await q(`select * from public.likes`)).length === 0, "likes of others visible");
});
await step("intent refused when the artist switched \"I want it\" off", async () => {
  await asUser(lea);
  await q(`update public.artworks set presale_enabled=false where id=$1`, [w1]);
  await asUser(sophie);
  await fails(`insert into public.purchase_intents (user_id, artwork_id) values ($1,$2)`, [sophie, w1], "row-level security");
  await asUser(lea);
  await q(`update public.artworks set presale_enabled=true where id=$1`, [w1]);
});
await step("one-click intent (no format); client price ignored; one per artwork; status protected", async () => {
  await asUser(sophie);
  const [i] = await q(`insert into public.purchase_intents (user_id, artwork_id, price_snapshot_cents)
                       values ($1,$2, 1) returning id, price_snapshot_cents, status, format_code`, [sophie, w1]);
  assert(i.price_snapshot_cents === null && i.format_code === null, JSON.stringify(i));
  await fails(`insert into public.purchase_intents (user_id, artwork_id, format_code) values ($1,$2,'A3')`, [sophie, w1], "duplicate");
  await q(`update public.purchase_intents set status='converted' where id=$1`, [i.id]);
  const [j] = await q(`select status from public.purchase_intents where id=$1`, [i.id]);
  assert(j.status === "active", "member set status to converted");
});
await step("artist sees aggregated stats for own artworks only", async () => {
  await asUser(lea);
  const rows = await q(`select * from public.my_artwork_stats() where artwork_id=$1`, [w1]);
  assert(rows[0].likes === 1 && rows[0].active_intents === 1, JSON.stringify(rows[0]));
  await asUser(tom);
  assert((await q(`select * from public.my_artwork_stats() where artwork_id=$1`, [w1])).length === 0, "stats of others visible");
});

console.log("Public likes (by order of magnitude) and notifications");
await step("like labels: nothing under 10, then 10+ / 20+ / 50+ / 1K+", async () => {
  const rows = await q(`select n, private.like_bucket(n) as l from unnest(array[0,9,10,19,20,49,50,99,100,999,1000,1999,2500,12000]) n`);
  const got = Object.fromEntries(rows.map((r) => [r.n, r.l]));
  const want = { 0: null, 9: null, 10: "10+", 19: "10+", 20: "20+", 49: "20+", 50: "50+", 99: "50+", 100: "100+", 999: "500+", 1000: "1K+", 1999: "1K+", 2500: "2K+", 12000: "10K+" };
  for (const [n, l] of Object.entries(want)) assert(got[n] === l, `like_bucket(${n}) = ${got[n]}, expected ${l}`);
});
await step("anon gets bucketed labels only, never exact counts", async () => {
  await asAnon();
  const rows = await q(`select * from public.artwork_like_buckets(array[$1]::uuid[])`, [w1]);
  assert(rows.length === 1 && rows[0].likes_label === null, `with 1 like, label must be empty: ${JSON.stringify(rows)}`);
  await fails(`select private.like_bucket(5)`, [], "permission denied");
});
await step("notification preferences: created for everyone, private", async () => {
  const [{ n }] = await q(`select count(*)::int as n from public.notification_preferences`);
  assert(n === 5, `expected 5 preference rows, got ${n}`);
  await asUser(sophie);
  await q(`update public.notification_preferences set email=true, sms=true, phone='+33 6 12 34 56 78' where profile_id=$1`, [sophie]);
  assert((await q(`select * from public.notification_preferences`)).length === 1, "sees others' preferences");
  await asAnon();
  assert((await q(`select * from public.notification_preferences`)).length === 0, "anon reads preferences");
});
await step("notifications: only the server creates them; users read and mark their own", async () => {
  await asUser(sophie);
  await fails(`insert into public.notifications (user_id, kind, title_en, title_fr) values ($1,'system','x','x')`, [sophie], "row-level security");
  await asSystem();
  const [nt] = await q(`insert into public.notifications (user_id, kind, artwork_id, title_en, title_fr)
                        values ($1,'presale_available',$2,'Available','Disponible') returning id`, [sophie, w1]);
  await asUser(tom);
  assert((await q(`select * from public.notifications`)).length === 0, "someone else's notification visible");
  await asUser(sophie);
  await q(`update public.notifications set read_at=now(), title_fr='hacked' where id=$1`, [nt.id]);
  await asSystem();
  const [r] = await q(`select read_at, title_fr from public.notifications where id=$1`, [nt.id]);
  assert(r.read_at !== null && r.title_fr === "Disponible", JSON.stringify(r));
});

console.log("Feed");
await step("anon feed = newest first, visible only", async () => {
  await asAnon();
  const rows = await q(`select * from public.get_feed(50, 0)`);
  assert(rows.length > 0 && rows.every((r) => r.reason === "recent"), "anon feed wrong");
});
await step("member feed mixes taste and discovery, excludes liked", async () => {
  await asUser(sophie);
  const rows = await q(`select * from public.get_feed(50, 0)`);
  const reasons = new Set(rows.map((r) => r.reason));
  assert(reasons.has("taste") && reasons.has("discovery"), `reasons: ${[...reasons]}`);
  assert(!rows.some((r) => r.artwork_id === w1), "liked artwork in feed");
});

console.log("Moderation (admin)");
await step("non-admin cannot suspend; admin can; suspended profile disappears", async () => {
  await asUser(tom);
  // RLS gives a non-admin no row to update: the statement "succeeds" on
  // zero rows. What matters is that nothing changed.
  await q(`update public.profile_moderation set status='suspended' where profile_id=$1`, [lea]);
  await asSystem();
  let [m] = await q(`select status from public.profile_moderation where profile_id=$1`, [lea]);
  assert(m.status === "active", "non-admin suspended someone");
  await asUser(admin);
  await q(`update public.profile_moderation set status='suspended', moderator_note='test' where profile_id=$1`, [lea]);
  await asAnon();
  assert((await q(`select * from public.profiles where id=$1`, [lea])).length === 0, "suspended profile visible");
  assert((await q(`select * from public.artworks where artist_id=$1`, [lea])).length === 0, "suspended artworks visible");
  await asUser(lea);
  [m] = await q(`select moderator_note from public.profile_moderation where profile_id=$1`, [lea]);
  assert(m.moderator_note === "test", "owner can't read the moderation note");
  await asUser(admin);
  await q(`update public.profile_moderation set status='active' where profile_id=$1`, [lea]);
  await asSystem();
  const [p] = await q(`select is_published from public.profiles where id=$1`, [lea]);
  assert(p.is_published, "not republished after unsuspend");
});
await step("admin grants founding badge; non-admin cannot edit flags", async () => {
  await asUser(admin);
  await q(`update public.profiles set founding_member=true where id=$1`, [lea]);
  await asUser(lea);
  await q(`update public.feature_flags set enabled=true where key='opportunities'`);
  await asSystem();
  const [p] = await q(`select founding_member from public.profiles where id=$1`, [lea]);
  const [f] = await q(`select enabled from public.feature_flags where key='opportunities'`);
  assert(p.founding_member === true, "admin could not set badge");
  assert(f.enabled === false, "non-admin edited a flag");
});
await step("reports: users report, only admins read", async () => {
  await asUser(sophie);
  await q(`insert into public.moderation_reports (target_type, target_id, reason) values ('artwork', $1, 'ai_generated')`, [w2]);
  assert((await q(`select * from public.moderation_reports`)).length === 0, "reporter reads reports");
  await asUser(admin);
  assert((await q(`select * from public.moderation_reports`)).length === 1, "admin can't read reports");
});

console.log("Opportunities and contacts (flags off at launch)");
await step("posting refused while the flag is off", async () => {
  await asUser(karim);
  await fails(`insert into public.opportunities (author_id, type, title, description, budget_min_cents, budget_max_cents)
               values ($1,'exhibition_call','Expo murs du café','Nous cherchons un artiste local pour exposer deux mois.',50000,80000)`,
    [karim], "row-level security");
});
await step("with flag on: unpaid refused, status forced to submitted, hidden until admin publishes", async () => {
  await q(`update public.feature_flags set enabled=true where key='opportunities'`);
  await asUser(karim);
  await fails(`insert into public.opportunities (author_id, type, title, description, budget_min_cents, budget_max_cents)
               values ($1,'exhibition_call','Expo gratuite','Exposition payée en visibilité uniquement, merci.',0,0)`,
    [karim], "check");
  const [o] = await q(`insert into public.opportunities (author_id, type, title, description, budget_min_cents, budget_max_cents, status)
                       values ($1,'exhibition_call','Expo murs du café','Nous cherchons un artiste local pour exposer deux mois.',50000,80000,'published')
                       returning id, status`, [karim]);
  assert(o.status === "submitted", `status ${o.status}`);
  await asAnon();
  assert((await q(`select * from public.opportunities`)).length === 0, "unreviewed opportunity public");
  await asUser(admin);
  await q(`update public.opportunities set status='published' where id=$1`, [o.id]);
  await asAnon();
  assert((await q(`select * from public.opportunities`)).length === 1, "published opportunity not visible");
  await asUser(sophie);
  await fails(`insert into public.opportunity_responses (opportunity_id, artist_id, message) values ($1,$2,'hello')`, [o.id, sophie], "row-level security");
  await asUser(lea);
  await q(`insert into public.opportunity_responses (opportunity_id, artist_id, message) values ($1,$2,'Bonjour !')`, [o.id, lea]);
  await asUser(karim);
  assert((await q(`select * from public.opportunity_responses`)).length === 1, "author can't read responses");
  await asSystem();
  await q(`update public.feature_flags set enabled=false where key='opportunities'`);
  await asAnon();
  assert((await q(`select * from public.opportunities`)).length === 0, "flag off but opportunities visible");
});
await step("contact requests refused while the flag is off", async () => {
  await asUser(karim);
  await fails(`insert into public.contact_requests (from_id, to_id, subject, message) values ($1,$2,'Expo','Bonjour')`, [karim, lea], "row-level security");
});

console.log("Editorial and storage");
await step("vernissage lists newly published artists", async () => {
  await asAnon();
  const rows = await q(`select id from public.vernissage_artists`);
  assert(rows.some((r) => r.id === lea), "vernissage empty");
});
await step("storage: artists upload in own folder only; members can't upload artworks", async () => {
  await asUser(lea);
  await q(`insert into storage.objects (bucket_id, name) values ('artworks', $1)`, [`${lea}/a.jpg`]);
  await fails(`insert into storage.objects (bucket_id, name) values ('artworks', $1)`, [`${tom}/a.jpg`], "row-level security");
  await asUser(sophie);
  await fails(`insert into storage.objects (bucket_id, name) values ('artworks', $1)`, [`${sophie}/a.jpg`], "row-level security");
  await q(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${sophie}/me.jpg`]);
});
await step("seed is idempotent and flags match the launch state", async () => {
  const rows = await q(`select key, enabled from public.feature_flags`);
  const m = Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
  assert(m.opportunities === false && m.organization_accounts === false && m.likes === true, JSON.stringify(m));
  const [{ n }] = await q(`select count(*)::int as n from public.tags where status='active'`);
  assert(n === 43, `expected 43 seed tags, got ${n}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

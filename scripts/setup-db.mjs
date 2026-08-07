// Creates the database (if needed), applies db/schema.sql, and seeds realistic
// demo data. Idempotent: `npm run db:reset` drops and rebuilds every table.
//
//   node --env-file=.env.local scripts/setup-db.mjs [--reset]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESET = process.argv.includes("--reset");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

/* ---------------------------------------------------- create database --- */

async function ensureDatabase() {
  const target = new URL(DATABASE_URL);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ""));

  // Hosted Postgres (Neon, Supabase, RDS…) hands you a database that already
  // exists and usually forbids CREATE DATABASE. If we can reach it, we're done.
  const probe = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await probe.connect();
    await probe.end();
    console.log(`Connected to "${dbName}".`);
    return;
  } catch {
    await probe.end().catch(() => {});
  }

  const adminUrl = process.env.ADMIN_DATABASE_URL || (() => {
    const u = new URL(DATABASE_URL);
    u.pathname = "/postgres";
    return u.toString();
  })();

  const admin = new pg.Client({ connectionString: adminUrl });
  try {
    await admin.connect();
  } catch (err) {
    console.error(`\nCould not connect as admin (${adminUrl.replace(/:[^:@/]+@/, ":****@")}).`);
    console.error(`  ${err.message}`);
    console.error("\nCreate the database manually, then re-run:");
    console.error(`  CREATE DATABASE ${dbName};`);
    return;
  }
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }
  await admin.end();
}

/* ------------------------------------------------------------ helpers --- */

// Deterministic PRNG so every reset produces the same demo dataset.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260807);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const chance = (p) => rand() < p;

const DAY = 86400000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const at = (dayOffset, hour) => {
  const d = startOfToday();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const round1k = (n) => Math.round(n / 1000) * 1000;

/* --------------------------------------------------------------- data --- */

const UNITS = [
  {
    name: "Skyline Studio 12A",
    code: "SKY-12A",
    type: "Studio",
    building: "Casa Grande Residence",
    address: "Jl. Casablanca Raya Kav. 88, Tebet, Jakarta Selatan",
    floor: "12",
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Air conditioning", "Smart TV", "Kitchenette", "Hot water", "Workspace", "Pool access"],
    description:
      "Bright top-floor studio with a full-height city window. Popular for afternoon rest slots and short work sessions. Keyless entry, self check-in.",
    base_rate: 75000,
    min_hours: 3,
    cleaning_fee: 35000,
    extra_guest_fee: 25000,
    status: "active",
  },
  {
    name: "Cozy Loft 8B",
    code: "LOFT-8B",
    type: "1 Bedroom",
    building: "Kemang Village",
    address: "Jl. Pangeran Antasari No. 36, Kemang, Jakarta Selatan",
    floor: "8",
    capacity: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Air conditioning", "Netflix", "Full kitchen", "Washing machine", "Balcony", "Gym access"],
    description:
      "Warm loft-style one-bedroom with a private balcony over the Kemang treeline. Separate bedroom makes it the pick for families booking a half-day.",
    base_rate: 95000,
    min_hours: 3,
    cleaning_fee: 45000,
    extra_guest_fee: 25000,
    status: "active",
  },
  {
    name: "Garden View 3C",
    code: "GDN-3C",
    type: "1 Bedroom",
    building: "Taman Rasuna",
    address: "Jl. H. R. Rasuna Said, Setiabudi, Jakarta Selatan",
    floor: "3",
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Air conditioning", "Smart TV", "Kitchenette", "Hot water", "Garden view"],
    description:
      "Quiet low-floor unit facing the inner garden. The budget pick — steady weekday demand from the surrounding offices.",
    base_rate: 65000,
    min_hours: 2,
    cleaning_fee: 30000,
    extra_guest_fee: 20000,
    status: "active",
  },
  {
    name: "Executive Suite 21F",
    code: "EXEC-21F",
    type: "2 Bedroom",
    building: "District 8 SCBD",
    address: "Jl. Jend. Sudirman Kav. 52-53, SCBD, Jakarta Selatan",
    floor: "21",
    capacity: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Air conditioning", "Smart TV", "Full kitchen", "Washing machine", "Workspace", "Pool access", "Gym access", "Parking"],
    description:
      "Two-bedroom corner suite with skyline views on both sides. Commands the highest hourly rate — mostly meeting and photoshoot bookings.",
    base_rate: 150000,
    min_hours: 4,
    cleaning_fee: 75000,
    extra_guest_fee: 35000,
    status: "active",
  },
];

const SHOT_CAPTIONS = {
  living: "Living area",
  bed: "Bedroom",
  bath: "Bathroom",
  view: "The view",
};

const GUESTS = [
  ["Andi Pratama", "+62 812-8834-1290"],
  ["Siti Rahmawati", "+62 813-9921-7745"],
  ["Budi Santoso", "+62 811-2200-5561"],
  ["Dewi Lestari", "+62 856-4410-3388"],
  ["Rizky Ramadhan", "+62 878-6612-9042"],
  ["Maya Anggraini", "+62 819-3345-8820"],
  ["Fajar Nugroho", "+62 812-7788-1104"],
  ["Putri Handayani", "+62 852-1199-6673"],
  ["Hendra Wijaya", "+62 896-5533-2418"],
  ["Nadia Kusuma", "+62 877-2244-9906"],
  ["Yoga Saputra", "+62 813-6677-3321"],
  ["Intan Permata", "+62 821-4455-8890"],
];

const SOURCES = ["whatsapp", "whatsapp", "whatsapp", "walk_in", "instagram", "repeat", "phone"];
const METHODS = ["transfer", "qris", "cash", "qris", "ewallet", "transfer"];

const PRICING_RULES = [
  { unit: null, name: "Weekend surcharge", kind: "day_of_week", params: { days: [5, 6], adjust_pct: 20 }, priority: 10 },
  { unit: null, name: "Night rate (22:00–06:00)", kind: "time_of_day", params: { from_hour: 22, to_hour: 6, adjust_pct: 15 }, priority: 20 },
  { unit: null, name: "Half-day discount (6h+)", kind: "duration", params: { min_hours: 6, adjust_pct: -10 }, priority: 30 },
  { unit: null, name: "Full-day discount (10h+)", kind: "duration", params: { min_hours: 10, adjust_pct: -20 }, priority: 31 },
  { unit: 4, name: "Peak lunch block (11:00–14:00)", kind: "time_of_day", params: { from_hour: 11, to_hour: 14, adjust_pct: 25 }, priority: 21 },
  { unit: null, name: "Year-end peak season", kind: "date_range", params: { start: "12-20", end: "01-05", adjust_pct: 35 }, priority: 5 },
  { unit: 2, name: "Weekday early-bird (before 10:00)", kind: "time_of_day", params: { from_hour: 6, to_hour: 10, adjust_pct: -10 }, priority: 22 },
];

// Mirrors src/lib/pricing.ts closely enough for believable seed totals.
function quote(unit, start, end, guests) {
  const hours = Math.max(unit.min_hours, Math.round((end - start) / 3600000));
  let base = 0;
  const cursor = new Date(start);
  for (let h = 0; h < hours; h++) {
    let rate = unit.base_rate;
    const dow = cursor.getDay();
    const hour = cursor.getHours();
    if (dow === 5 || dow === 6) rate *= 1.2;
    if (hour >= 22 || hour < 6) rate *= 1.15;
    if (unit.code === "EXEC-21F" && hour >= 11 && hour < 14) rate *= 1.25;
    base += rate;
    cursor.setHours(cursor.getHours() + 1);
  }
  base = round1k(base);
  let discount = 0;
  if (hours >= 10) discount = round1k(base * 0.2);
  else if (hours >= 6) discount = round1k(base * 0.1);
  let fees = unit.cleaning_fee;
  const extra = Math.max(0, guests - unit.capacity);
  if (extra > 0) fees += extra * unit.extra_guest_fee;
  const breakdown = [
    { label: `${hours} h × ${unit.base_rate.toLocaleString("id-ID")} base`, amount: base },
    ...(discount ? [{ label: hours >= 10 ? "Full-day discount 20%" : "Half-day discount 10%", amount: -discount }] : []),
    { label: "Cleaning fee", amount: unit.cleaning_fee },
    ...(extra > 0 ? [{ label: `Extra guest × ${extra}`, amount: extra * unit.extra_guest_fee }] : []),
  ];
  return { hours, base, discount, fees, total: base - discount + fees, breakdown };
}

const WA_THREADS = [
  {
    name: "Andi Pratama",
    phone: "+6281288341290",
    labels: ["repeat guest"],
    unread: 2,
    msgs: [
      ["in", "Halo kak, Skyline Studio 12A available besok sore?", -190],
      ["out", "Hi Andi! Yes, 12A is open tomorrow from 14:00. Minimum 3 hours, Rp 75.000/hour + Rp 35.000 cleaning.", -186],
      ["in", "Oke, saya ambil 15:00-19:00 ya", -180],
      ["out", "Booked ✅ 15:00–19:00, total Rp 335.000. I'll send the door code an hour before check-in.", -176],
      ["in", "Siap, thanks kak 🙏", -172],
      ["in", "Kak, bisa extend 1 jam nggak?", -22],
      ["in", "Halo?", -8],
    ],
  },
  {
    name: "Siti Rahmawati",
    phone: "+6281399217745",
    labels: ["new"],
    unread: 1,
    msgs: [
      ["in", "Selamat siang, ada unit 2 kamar untuk 4 orang? Untuk hari Sabtu.", -320],
      ["out", "Siang! Executive Suite 21F fits 4 — 2 bedrooms, 2 bathrooms, SCBD. Rp 150.000/hour, minimum 4 hours. Saturday has a 20% weekend rate.", -312],
      ["in", "Boleh lihat fotonya?", -300],
      ["out", "Sending photos now 📸", -298],
      ["in", "Bagus banget! Saya diskusi dulu sama suami ya", -290],
      ["in", "Kak jadi book Sabtu 12:00-18:00, masih bisa?", -35],
    ],
  },
  {
    name: "Budi Santoso",
    phone: "+6281122005561",
    labels: ["corporate"],
    unread: 0,
    msgs: [
      ["in", "Pak, untuk meeting tim 6 orang, 4 jam. Ada proyektor?", -900],
      ["out", "Hi Pak Budi — 21F has a Smart TV with HDMI + screen mirroring, no projector. Workspace desk for 6. Extra guest fee Rp 35.000 each above 4.", -890],
      ["in", "Oke cukup. Book Kamis 13:00-17:00.", -880],
      ["out", "Confirmed ✅ Thursday 13:00–17:00 at Executive Suite 21F. Invoice sent to your email.", -876],
      ["in", "Sudah transfer ya", -870],
      ["out", "Received, thank you! 🙏", -864],
    ],
  },
  {
    name: "Dewi Lestari",
    phone: "+6285644103388",
    labels: ["repeat guest", "vip"],
    unread: 0,
    msgs: [
      ["in", "Hai kak, seperti biasa ya, Garden View 3C jam 10-13", -1400],
      ["out", "Of course Bu Dewi 😊 3C, 10:00–13:00, Rp 225.000 total. Same door code as last time.", -1396],
      ["in", "Makasih! 🌸", -1390],
      ["out", "Anytime! See you 👋", -1388],
    ],
  },
  {
    name: "Rizky Ramadhan",
    phone: "+6287866129042",
    labels: [],
    unread: 3,
    msgs: [
      ["in", "Bang, ada yang kosong sekarang?", -50],
      ["in", "Butuh 3 jam aja", -48],
      ["out", "Let me check the schedule for you 👀", -45],
      ["in", "Ditunggu ya bang", -12],
      ["in", "Halo bang masih ada?", -6],
      ["in", "Kalau nggak ada gapapa, besok juga bisa", -3],
    ],
  },
  {
    name: "Maya Anggraini",
    phone: "+6281933458820",
    labels: ["photoshoot"],
    unread: 0,
    msgs: [
      ["in", "Halo, untuk photoshoot produk 5 jam bisa? Butuh natural light.", -2600],
      ["out", "Yes! Skyline Studio 12A has full-height windows, best light 09:00–13:00. 5 hours qualifies for the 10% half-day discount.", -2580],
      ["in", "Perfect. Book Rabu 09:00-14:00 ya", -2570],
      ["out", "Done ✅ Wednesday 09:00–14:00 at 12A. Total Rp 372.000 after discount.", -2566],
      ["in", "Nanti kalau bagus saya repeat bulanan", -2560],
      ["out", "Would love that — we can set up a monthly rate 🙌", -2556],
    ],
  },
];

/* --------------------------------------------------------------- seed --- */

async function seed(client) {
  console.log("Seeding…");

  // Units + photos
  const unitIds = [];
  for (let i = 0; i < UNITS.length; i++) {
    const u = UNITS[i];
    const { rows } = await client.query(
      `INSERT INTO units (name, code, type, building, address, floor, capacity, bedrooms, bathrooms,
                          amenities, description, base_rate, min_hours, cleaning_fee, extra_guest_fee, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [u.name, u.code, u.type, u.building, u.address, u.floor, u.capacity, u.bedrooms, u.bathrooms,
       u.amenities, u.description, u.base_rate, u.min_hours, u.cleaning_fee, u.extra_guest_fee, u.status]
    );
    const id = rows[0].id;
    unitIds.push(id);
    const shots = ["living", "bed", "view", "bath"];
    for (let s = 0; s < shots.length; s++) {
      await client.query(
        `INSERT INTO unit_photos (unit_id, url, caption, sort_order, is_cover)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, `/seed/unit-${i + 1}-${shots[s]}.png`, SHOT_CAPTIONS[shots[s]], s, s === 0]
      );
    }
  }
  console.log(`  ${unitIds.length} units, ${unitIds.length * 4} photos`);

  // Pricing rules
  for (const r of PRICING_RULES) {
    await client.query(
      `INSERT INTO pricing_rules (unit_id, name, kind, params, priority, active) VALUES ($1,$2,$3,$4,$5,true)`,
      [r.unit ? unitIds[r.unit - 1] : null, r.name, r.kind, JSON.stringify(r.params), r.priority]
    );
  }
  console.log(`  ${PRICING_RULES.length} pricing rules`);

  // Bookings across the last 45 days and the next 12
  const SLOTS = [
    [8, 3], [8, 4], [9, 5], [11, 3], [12, 4], [13, 4],
    [15, 3], [16, 4], [18, 3], [19, 4], [20, 3], [21, 4],
  ];
  const now = Date.now();
  let bookingCount = 0;
  let paymentCount = 0;
  let seq = 1000;

  for (let day = -45; day <= 12; day++) {
    for (let ui = 0; ui < UNITS.length; ui++) {
      const unit = UNITS[ui];
      const dow = at(day, 12).getDay();
      const weekend = dow === 0 || dow === 5 || dow === 6;
      // Higher-priced units book less often; weekends book more.
      const base = ui === 3 ? 0.34 : ui === 2 ? 0.62 : 0.5;
      const load = base * (weekend ? 1.45 : 1) * (day > 6 ? 0.45 : 1);
      const target = Math.min(3, Math.round(load * 3));
      const used = [];
      for (let n = 0; n < target; n++) {
        const [startHour, dur] = pick(SLOTS);
        if (used.some(([s, d]) => startHour < s + d && s < startHour + dur)) continue;
        used.push([startHour, dur]);

        const start = at(day, startHour);
        const end = new Date(start.getTime() + dur * 3600000);
        const [guestName, guestPhone] = pick(GUESTS);
        const guests = chance(0.2) ? unit.capacity + 1 : int(1, unit.capacity);
        const q = quote(unit, start, end, guests);

        let status;
        if (end.getTime() < now) status = chance(0.05) ? "no_show" : chance(0.05) ? "cancelled" : "completed";
        else if (start.getTime() <= now && end.getTime() >= now) status = "checked_in";
        else status = chance(0.15) ? "inquiry" : "confirmed";

        const code = `BK-${seq++}`;
        let bookingId;
        try {
          const { rows } = await client.query(
            `INSERT INTO bookings (code, unit_id, guest_name, guest_phone, guests, starts_at, ends_at, hours,
                                   base_amount, fees_amount, discount_amount, total_amount, breakdown, status, source, notes, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
            [code, unitIds[ui], guestName, guestPhone, guests, start, end, q.hours,
             q.base, q.fees, q.discount, q.total, JSON.stringify(q.breakdown), status, pick(SOURCES),
             chance(0.25) ? pick(["Late check-in requested", "Bring extra towels", "Repeat guest — same door code", "Needs early access for setup"]) : "",
             new Date(start.getTime() - int(1, 96) * 3600000)]
          );
          bookingId = rows[0].id;
          bookingCount++;
        } catch (err) {
          if (err.code === "23P01") continue; // overlap guard — skip
          throw err;
        }

        if (status === "completed" || status === "checked_in") {
          await client.query(
            `INSERT INTO payments (booking_id, amount, method, paid_at, note) VALUES ($1,$2,$3,$4,$5)`,
            [bookingId, q.total, pick(METHODS), new Date(start.getTime() - int(0, 24) * 3600000), "Paid in full"]
          );
          paymentCount++;
        } else if (status === "confirmed" && chance(0.65)) {
          const deposit = round1k(q.total * 0.5);
          await client.query(
            `INSERT INTO payments (booking_id, amount, method, paid_at, note) VALUES ($1,$2,$3,$4,$5)`,
            [bookingId, deposit, pick(METHODS), new Date(Math.min(now, start.getTime() - 3600000)), "50% deposit"]
          );
          paymentCount++;
        }
      }
    }
  }
  console.log(`  ${bookingCount} bookings, ${paymentCount} payments`);

  // Expenses
  const EXPENSES = [
    ["cleaning", 150000, 260000, "Cleaning crew"],
    ["utilities", 320000, 720000, "Electricity + water"],
    ["supplies", 80000, 240000, "Towels, toiletries, coffee"],
    ["maintenance", 200000, 1400000, "AC service / repairs"],
    ["marketing", 100000, 500000, "Instagram ads"],
  ];
  let expenseCount = 0;
  for (let day = -45; day <= 0; day += 1) {
    for (let ui = 0; ui < UNITS.length; ui++) {
      if (!chance(0.28)) continue;
      const [category, lo, hi, note] = pick(EXPENSES);
      const d = at(day, 12);
      await client.query(
        `INSERT INTO expenses (unit_id, category, amount, incurred_on, note) VALUES ($1,$2,$3,$4,$5)`,
        [unitIds[ui], category, round1k(int(lo, hi)), d.toISOString().slice(0, 10), note]
      );
      expenseCount++;
    }
  }
  // Building-level rent, one per month
  for (const off of [-30, 0]) {
    const d = at(off, 12);
    await client.query(
      `INSERT INTO expenses (unit_id, category, amount, incurred_on, note) VALUES (NULL,'rent',$1,$2,'Monthly unit lease (all units)')`,
      [18000000, d.toISOString().slice(0, 10)]
    );
    expenseCount++;
  }
  console.log(`  ${expenseCount} expenses`);

  // WhatsApp inbox (demo data — swap for the Cloud API webhook when you go live)
  for (let i = 0; i < WA_THREADS.length; i++) {
    const t = WA_THREADS[i];
    const last = new Date(now + t.msgs[t.msgs.length - 1][2] * 60000);
    const { rows } = await client.query(
      `INSERT INTO wa_contacts (phone, name, avatar_hue, last_message_at, unread, labels)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [t.phone, t.name, (i * 47) % 360, last, t.unread, t.labels]
    );
    for (const [direction, body, minsAgo] of t.msgs) {
      await client.query(
        `INSERT INTO wa_messages (contact_id, direction, body, status, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [rows[0].id, direction, body, direction === "out" ? "read" : "delivered", new Date(now + minsAgo * 60000)]
      );
    }
  }
  console.log(`  ${WA_THREADS.length} WhatsApp threads`);

  await client.query(
    `INSERT INTO app_settings (key, value) VALUES ('business', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify({
      name: "Brandon Stays",
      tagline: "Hourly apartments, Jakarta Selatan",
      phone: "+62 812-0000-1234",
      currency: "IDR",
      locale: "en-ID",
      checkinNote: "Self check-in with door code. Code is sent 1 hour before your slot.",
    })]
  );
}

/* ---------------------------------------------------------------- main --- */

(async () => {
  await ensureDatabase();

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(
    "SELECT to_regclass('public.units') IS NOT NULL AS exists"
  );
  if (rows[0].exists && !RESET) {
    console.log("\nSchema already present. Re-run with --reset (npm run db:reset) to wipe and reseed.");
    await client.end();
    return;
  }

  console.log("Applying db/schema.sql…");
  await client.query(fs.readFileSync(path.join(ROOT, "db/schema.sql"), "utf8"));
  await seed(client);
  await client.end();
  console.log("\nDatabase ready. Start the app with:  npm run dev");
})().catch((err) => {
  console.error("\nSetup failed:", err.message);
  if (err.detail) console.error("  " + err.detail);
  process.exit(1);
});

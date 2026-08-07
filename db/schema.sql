-- Brandon App — hourly apartment rental manager
-- PostgreSQL schema. Money is stored in whole IDR (rupiah has no working minor unit).

CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP TABLE IF EXISTS wa_messages CASCADE;
DROP TABLE IF EXISTS wa_contacts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS unit_photos CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

CREATE TABLE units (
  id              serial PRIMARY KEY,
  name            text NOT NULL,
  code            text UNIQUE,
  type            text NOT NULL DEFAULT 'Studio',
  building        text NOT NULL DEFAULT '',
  address         text NOT NULL DEFAULT '',
  floor           text NOT NULL DEFAULT '',
  capacity        int  NOT NULL DEFAULT 2,
  bedrooms        int  NOT NULL DEFAULT 1,
  bathrooms       int  NOT NULL DEFAULT 1,
  amenities       text[] NOT NULL DEFAULT '{}',
  description     text NOT NULL DEFAULT '',
  base_rate       bigint NOT NULL DEFAULT 0,   -- IDR per hour
  min_hours       int  NOT NULL DEFAULT 3,
  cleaning_fee    bigint NOT NULL DEFAULT 0,   -- flat, per booking
  extra_guest_fee bigint NOT NULL DEFAULT 0,   -- per guest over capacity, per booking
  status          text NOT NULL DEFAULT 'active', -- active | maintenance | inactive
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE unit_photos (
  id         serial PRIMARY KEY,
  unit_id    int NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  url        text NOT NULL,
  caption    text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_cover   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX unit_photos_unit_idx ON unit_photos (unit_id, sort_order);

CREATE TABLE pricing_rules (
  id         serial PRIMARY KEY,
  unit_id    int REFERENCES units(id) ON DELETE CASCADE, -- NULL = applies to every unit
  name       text NOT NULL,
  kind       text NOT NULL,   -- day_of_week | time_of_day | date_range | duration | fee
  params     jsonb NOT NULL DEFAULT '{}',
  priority   int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP SEQUENCE IF EXISTS booking_code_seq;
CREATE SEQUENCE booking_code_seq START 2000;

CREATE TABLE bookings (
  id              serial PRIMARY KEY,
  code            text UNIQUE NOT NULL DEFAULT ('BK-' || nextval('booking_code_seq')),
  unit_id         int NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  guest_name      text NOT NULL,
  guest_phone     text NOT NULL DEFAULT '',
  guests          int NOT NULL DEFAULT 2,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  hours           numeric(6,2) NOT NULL,
  base_amount     bigint NOT NULL DEFAULT 0,
  fees_amount     bigint NOT NULL DEFAULT 0,
  discount_amount bigint NOT NULL DEFAULT 0,
  total_amount    bigint NOT NULL DEFAULT 0,
  breakdown       jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'confirmed',  -- inquiry | confirmed | checked_in | completed | cancelled | no_show
  source          text NOT NULL DEFAULT 'whatsapp',   -- whatsapp | walk_in | phone | instagram | repeat
  notes           text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_order CHECK (ends_at > starts_at)
);
CREATE INDEX bookings_unit_time_idx ON bookings (unit_id, starts_at);
CREATE INDEX bookings_time_idx ON bookings (starts_at);

-- Hard guarantee against double-booking a unit. Cancelled / no-show rows are exempt.
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    unit_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'no_show'));

CREATE TABLE payments (
  id         serial PRIMARY KEY,
  booking_id int NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount     bigint NOT NULL,
  method     text NOT NULL DEFAULT 'cash', -- cash | transfer | qris | ewallet | card
  paid_at    timestamptz NOT NULL DEFAULT now(),
  note       text NOT NULL DEFAULT ''
);
CREATE INDEX payments_booking_idx ON payments (booking_id);
CREATE INDEX payments_paid_idx ON payments (paid_at);

CREATE TABLE expenses (
  id          serial PRIMARY KEY,
  unit_id     int REFERENCES units(id) ON DELETE SET NULL,
  category    text NOT NULL DEFAULT 'other', -- cleaning | utilities | supplies | maintenance | rent | marketing | other
  amount      bigint NOT NULL,
  incurred_on date NOT NULL DEFAULT current_date,
  note        text NOT NULL DEFAULT ''
);
CREATE INDEX expenses_date_idx ON expenses (incurred_on);

CREATE TABLE wa_contacts (
  id              serial PRIMARY KEY,
  phone           text UNIQUE NOT NULL,
  name            text NOT NULL,
  avatar_hue      int NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread          int NOT NULL DEFAULT 0,
  labels          text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE wa_messages (
  id         serial PRIMARY KEY,
  contact_id int NOT NULL REFERENCES wa_contacts(id) ON DELETE CASCADE,
  direction  text NOT NULL,                    -- in | out
  body       text NOT NULL DEFAULT '',
  media_url  text,
  status     text NOT NULL DEFAULT 'delivered', -- pending | sent | delivered | read | failed
  wa_id      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wa_messages_thread_idx ON wa_messages (contact_id, created_at);

CREATE TABLE app_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

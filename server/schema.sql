CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('ADMIN','OFFICER','RESCUE','TOURISM','CITIZEN','TOURIST')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS fire_reports (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  latitude NUMERIC(9,6), longitude NUMERIC(9,6),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status TEXT NOT NULL DEFAULT 'REPORTED',
  image_url TEXT,
  cloudinary_public_id TEXT,
  reported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS conflict_reports (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  latitude NUMERIC(9,6), longitude NUMERIC(9,6),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status TEXT NOT NULL DEFAULT 'REPORTED',
  image_url TEXT,
  cloudinary_public_id TEXT,
  reported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS animals (
  id BIGSERIAL PRIMARY KEY, animal_id TEXT NOT NULL UNIQUE, species TEXT NOT NULL,
  health_status TEXT NOT NULL DEFAULT 'HEALTHY', image_url TEXT, cloudinary_public_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rescue_cases (
  id BIGSERIAL PRIMARY KEY, animal_id BIGINT REFERENCES animals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', location TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS patrols (
  id BIGSERIAL PRIMARY KEY, zone TEXT NOT NULL, officer_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ASSIGNED', scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS plantations (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL, species TEXT NOT NULL DEFAULT '',
  trees_planted INTEGER NOT NULL DEFAULT 0 CHECK (trees_planted >= 0), image_url TEXT, cloudinary_public_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS destinations (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  entry_fee NUMERIC(10,2) NOT NULL DEFAULT 0, image_url TEXT, cloudinary_public_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY, destination_id BIGINT REFERENCES destinations(id) ON DELETE SET NULL,
  visitor_name TEXT NOT NULL, visit_date DATE NOT NULL, time_slot TEXT NOT NULL DEFAULT '',
  visitor_count INTEGER NOT NULL DEFAULT 1 CHECK (visitor_count > 0), status TEXT NOT NULL DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fire_reports_created_idx ON fire_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS conflict_reports_created_idx ON conflict_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','caretaker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS custodies (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  caretaker_id UUID REFERENCES users(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','awaiting_confirmation','closed','cancelled')),
  location_label TEXT NOT NULL,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  location_source TEXT NOT NULL DEFAULT 'manual' CHECK (location_source IN ('manual','device','demo')),
  round_interval_minutes INTEGER NOT NULL CHECK (round_interval_minutes BETWEEN 1 AND 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  close_outcome TEXT CHECK (close_outcome IN ('conforme','observacion')),
  close_note TEXT,
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CHECK (caretaker_id IS NULL OR caretaker_id <> owner_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_custody_per_vehicle ON custodies(vehicle_id)
  WHERE status IN ('pending','active','awaiting_confirmation');
CREATE INDEX IF NOT EXISTS custodies_owner_idx ON custodies(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS custodies_caretaker_idx ON custodies(caretaker_id, created_at DESC);
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY,
  custody_id UUID NOT NULL REFERENCES custodies(id),
  caretaker_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('ok','incident')),
  note TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  location_source TEXT NOT NULL DEFAULT 'manual' CHECK (location_source IN ('manual','device','demo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  UNIQUE(id, custody_id)
);
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY,
  custody_id UUID NOT NULL REFERENCES custodies(id),
  round_id UUID,
  phase TEXT NOT NULL CHECK (phase IN ('initial','round','final')),
  position TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('camera','upload','demo')),
  image_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((phase = 'round') = (round_id IS NOT NULL)),
  FOREIGN KEY(round_id, custody_id) REFERENCES rounds(id, custody_id)
);
CREATE INDEX IF NOT EXISTS rounds_custody_idx ON rounds(custody_id, created_at);
CREATE INDEX IF NOT EXISTS evidence_custody_idx ON evidence(custody_id, phase, created_at);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;

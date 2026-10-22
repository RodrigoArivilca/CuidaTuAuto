-- Conserva los datos del vehículo tal como estaban al iniciar la custodia.
ALTER TABLE custodies ADD COLUMN IF NOT EXISTS vehicle_snapshot JSONB;
UPDATE custodies c SET vehicle_snapshot = jsonb_build_object(
  'id',v.id,'ownerId',v.owner_id,'plate',v.plate,'brand',v.brand,
  'model',v.model,'color',v.color,'createdAt',v.created_at
) FROM vehicles v WHERE c.vehicle_id=v.id AND c.vehicle_snapshot IS NULL;
ALTER TABLE custodies ALTER COLUMN vehicle_snapshot SET NOT NULL;
INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;

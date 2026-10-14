-- Compatibility repair: this migration originally duplicated all 13 CMS DDL
-- statements already supplied by 20260929170000_add_cms_foundation.
-- Original SQL and checksum transition plan: prisma/migration-history/.
-- Keep the migration identity; replay must not create those objects twice.
DO $$
BEGIN
  IF to_regtype('"MediaCategory"') IS NULL
     OR to_regclass('"Media"') IS NULL
     OR to_regclass('"Hero"') IS NULL
     OR to_regclass('"HomepageSection"') IS NULL THEN
    RAISE EXCEPTION 'CMS foundation is missing; inspect migration history and schema before continuing';
  END IF;
END
$$;

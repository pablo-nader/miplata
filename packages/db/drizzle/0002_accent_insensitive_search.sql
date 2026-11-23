CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE FUNCTION immutable_unaccent(input text) RETURNS text
	LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
	AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, input) $$;--> statement-breakpoint
DROP INDEX "movement_description_trgm_idx";--> statement-breakpoint
CREATE INDEX "movement_description_search_idx" ON "movement" USING gin (immutable_unaccent(lower("description")) gin_trgm_ops);

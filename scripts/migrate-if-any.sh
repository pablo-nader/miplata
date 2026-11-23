#!/usr/bin/env bash
set -euo pipefail

if compgen -G "packages/db/drizzle/*.sql" > /dev/null; then
  : "${DATABASE_URL:?DATABASE_URL is required to apply migrations}"
  pnpm --filter @miplata/db migrate
else
  echo "No migrations to apply"
fi

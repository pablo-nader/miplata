#!/usr/bin/env bash
set -euo pipefail

if compgen -G "packages/db/drizzle/*.sql" > /dev/null; then
  pnpm --filter @miplata/db migrate
else
  echo "No migrations to apply"
fi

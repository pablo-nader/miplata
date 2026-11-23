import { type Database, eq, institution } from "@miplata/db";
import { institutionKindSchema } from "@miplata/shared";
import type { InstitutionRepository } from "../application/accounts";

const columns = {
  id: institution.id,
  kind: institution.kind,
  name: institution.name,
  logoPath: institution.logoPath,
};

type Row = { id: string; kind: string; name: string; logoPath: string | null };

function toInstitution(row: Row) {
  return { ...row, kind: institutionKindSchema.parse(row.kind) };
}

export function drizzleInstitutionRepository(db: Database): InstitutionRepository {
  return {
    async list() {
      const rows = await db
        .select(columns)
        .from(institution)
        .orderBy(institution.kind, institution.name);
      return rows.map(toInstitution);
    },
    async find(institutionId) {
      const [row] = await db
        .select(columns)
        .from(institution)
        .where(eq(institution.id, institutionId));
      return row ? toInstitution(row) : null;
    },
  };
}

import { type Database, eq, user } from "@miplata/db";
import { type Locale, localeSchema, type MeResponse } from "@miplata/shared";
import type { UserProfileRepository } from "../application/user-profile";

const columns = {
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  locale: user.locale,
};

function toProfile(row: Omit<MeResponse, "locale"> & { locale: string }): MeResponse {
  return { ...row, locale: localeSchema.parse(row.locale) };
}

export function drizzleUserProfileRepository(db: Database): UserProfileRepository {
  return {
    async findById(userId) {
      const [row] = await db.select(columns).from(user).where(eq(user.id, userId));
      return row ? toProfile(row) : null;
    },
    async updateLocale(userId: string, locale: Locale) {
      const [row] = await db
        .update(user)
        .set({ locale, updatedAt: new Date() })
        .where(eq(user.id, userId))
        .returning(columns);
      return row ? toProfile(row) : null;
    },
  };
}

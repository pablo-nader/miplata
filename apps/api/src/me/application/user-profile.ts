import type { Locale, MeResponse } from "@miplata/shared";

export type UserProfileRepository = {
  findById(userId: string): Promise<MeResponse | null>;
  updateLocale(userId: string, locale: Locale): Promise<MeResponse | null>;
};

export function getMe(users: UserProfileRepository, userId: string) {
  return users.findById(userId);
}

export function updateLocale(users: UserProfileRepository, userId: string, locale: Locale) {
  return users.updateLocale(userId, locale);
}

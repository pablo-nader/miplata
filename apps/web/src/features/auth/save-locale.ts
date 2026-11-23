import type { Locale } from "@miplata/shared";

export async function saveLocale(locale: Locale): Promise<boolean> {
  try {
    const response = await fetch("/api/me/locale", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

import type { IsoDate } from "@miplata/shared";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInArgentina(now: Date = new Date()): IsoDate {
  return formatter.format(now);
}

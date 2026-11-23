import { z } from "zod";

export type IsoDate = string;
export type YearMonth = string;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseMonth(month: YearMonth): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new RangeError(`Invalid month: ${month}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function formatMonth(year: number, month: number): YearMonth {
  return `${pad(year, 4)}-${pad(month, 2)}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(month: YearMonth): number {
  const parsed = parseMonth(month);
  if (parsed.month === 2 && isLeapYear(parsed.year)) {
    return 29;
  }
  return MONTH_LENGTHS[parsed.month - 1] as number;
}

export function monthOf(date: IsoDate): YearMonth {
  return date.slice(0, 7);
}

export function dateInMonth(month: YearMonth, day: number): IsoDate {
  if (!Number.isInteger(day) || day < 1) {
    throw new RangeError(`Invalid day of month: ${day}`);
  }
  return `${month}-${pad(Math.min(day, daysInMonth(month)), 2)}`;
}

export function addMonths(month: YearMonth, offset: number): YearMonth {
  const parsed = parseMonth(month);
  const index = parsed.year * 12 + (parsed.month - 1) + offset;
  return formatMonth(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

export function compareMonths(a: YearMonth, b: YearMonth): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function monthsBetween(from: YearMonth, to: YearMonth): YearMonth[] {
  const months: YearMonth[] = [];
  for (let current = from; compareMonths(current, to) <= 0; current = addMonths(current, 1)) {
    months.push(current);
  }
  return months;
}

function isRealDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const month = `${match[1]}-${match[2]}`;
  if (!MONTH_PATTERN.test(month)) {
    return false;
  }
  const day = Number(match[3]);
  return day >= 1 && day <= daysInMonth(month);
}

export const isoDateSchema = z.string().refine(isRealDate, { message: "Invalid date" });

export const yearMonthSchema = z.string().regex(MONTH_PATTERN, { message: "Invalid month" });

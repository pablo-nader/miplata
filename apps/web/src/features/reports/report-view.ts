import { addMonths, type MonthlyReport, type YearMonth } from "@miplata/shared";
import { MINUS, type MoneyLocale } from "../../ui/format/money";

export function currentMonth(now: Date = new Date()): YearMonth {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function shiftMonth(month: YearMonth, offset: number): YearMonth {
  return addMonths(month, offset);
}

function monthDate(month: YearMonth): Date {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (number ?? 1) - 1, 1));
}

export function formatMonthLabel(month: YearMonth, locale: MoneyLocale): string {
  const text = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate(month));
  return text.replace(/^./, (first) => first.toLocaleUpperCase(locale));
}

export function formatShortMonth(month: YearMonth, locale: MoneyLocale): string {
  const text = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
    monthDate(month),
  );
  return text.replace(/\.$/, "").replace(/^./, (first) => first.toLocaleUpperCase(locale));
}

export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) {
    return 0;
  }
  return Math.round((value / max) * 1000) / 10;
}

export function formatPercentChange(value: number, locale: MoneyLocale): string {
  const body = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  const sign = value > 0 ? "+" : value < 0 ? MINUS : "";
  return `${sign}${body} %`;
}

export function formatShare(value: number, locale: MoneyLocale): string {
  const body = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
  return `${body} %`;
}

export type ChartLayout = {
  plotHeight: number;
  slotWidth: number;
  barWidth: number;
  gap: number;
};

export type ChartBar = {
  month: YearMonth;
  kind: "in" | "out";
  x: number;
  y: number;
  width: number;
  height: number;
};

export function chartBars(months: MonthlyReport["months"], layout: ChartLayout): ChartBar[] {
  const max = months.reduce((top, item) => Math.max(top, item.inMinor, item.outMinor), 0);
  const pairWidth = layout.barWidth * 2 + layout.gap;
  const inset = (layout.slotWidth - pairWidth) / 2;
  return months.flatMap((item, index) => {
    const left = index * layout.slotWidth + inset;
    const bar = (kind: ChartBar["kind"], value: number, x: number): ChartBar => {
      const height = max === 0 ? 0 : Math.round((value / max) * layout.plotHeight * 10) / 10;
      return {
        month: item.month,
        kind,
        x,
        y: layout.plotHeight - height,
        width: layout.barWidth,
        height,
      };
    };
    return [
      bar("in", item.inMinor, left),
      bar("out", item.outMinor, left + layout.barWidth + layout.gap),
    ];
  });
}

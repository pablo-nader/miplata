import type {
  BankFiguresRequest,
  Currency,
  IsoDate,
  StatementOtherLine,
  StatementPaymentLine,
  StatementPurchaseLine,
} from "@miplata/shared";
import type { AmountLine, StatementRow } from "../domain/statement-summary";

export type CardSchedule = { accountId: string; closingDay: number; dueDay: number };

export type ChargeLine = {
  movementId: string;
  categoryId: string | null;
  description: string | null;
  occurredOn: IsoDate;
  currency: Currency;
  amountMinor: number;
};

export type DetailLines = {
  purchases: StatementPurchaseLine[];
  others: StatementOtherLine[];
  charges: ChargeLine[];
  payments: StatementPaymentLine[];
};

export type StatementRepository = {
  exclusive<T>(userId: string, statementId: string, work: () => Promise<T>): Promise<T>;
  ensureOpen(userId: string, schedule: CardSchedule, today: IsoDate): Promise<void>;
  rows(userId: string, accountId: string): Promise<StatementRow[]>;
  find(userId: string, statementId: string): Promise<StatementRow | null>;
  amountLines(userId: string, accountId: string): Promise<AmountLine[]>;
  detailLines(userId: string, statementId: string): Promise<DetailLines>;
  updateDates(
    userId: string,
    statementId: string,
    dates: { closingDate: IsoDate; dueDate: IsoDate },
    schedule: CardSchedule,
  ): Promise<boolean>;
  setBankFigures(
    userId: string,
    statementId: string,
    figures: BankFiguresRequest,
  ): Promise<boolean>;
};

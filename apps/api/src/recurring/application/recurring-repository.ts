import type { Currency, IsoDate, Occurrence, Recurring } from "@miplata/shared";

export type RecurringFields = Omit<Recurring, "id" | "isPaused">;

export type GenerationCandidate = { recurring: Recurring; latestDueOn: IsoDate | null };

export type OccurrenceRow = { recurringId: string; dueOn: IsoDate; status: "pending" | "skipped" };

export type StoredOccurrence = { occurrence: Occurrence; status: string };

export type CommittedFilter = {
  currency: Currency;
  from: IsoDate;
  to: IsoDate;
  accountId?: string | undefined;
  categoryId?: string | undefined;
};

export type CommittedSchedule = {
  items: { recurring: Recurring; estimateMinor: number | null }[];
  resolved: { recurringId: string; dueOn: IsoDate }[];
};

export type SkipOutcome = "skipped" | "not_found" | "resolved";

export type RecurringRepository = {
  list(userId: string): Promise<Recurring[]>;
  find(userId: string, recurringId: string): Promise<Recurring | null>;
  create(userId: string, fields: RecurringFields): Promise<Recurring>;
  update(
    userId: string,
    recurringId: string,
    fields: RecurringFields,
    today: IsoDate,
  ): Promise<Recurring | null>;
  pause(userId: string, recurringId: string, today: IsoDate): Promise<Recurring | null>;
  resume(userId: string, recurringId: string): Promise<Recurring | null>;
  end(userId: string, recurringId: string, endsOn: IsoDate): Promise<Recurring | null>;
  generationCandidates(userId: string, recurringId?: string): Promise<GenerationCandidate[]>;
  insertOccurrences(userId: string, rows: OccurrenceRow[]): Promise<void>;
  pendingOccurrences(
    userId: string,
    through: IsoDate,
    type?: "income" | "expense",
  ): Promise<Occurrence[]>;
  findOccurrence(userId: string, occurrenceId: string): Promise<StoredOccurrence | null>;
  skip(userId: string, occurrenceId: string): Promise<SkipOutcome>;
  committedSchedule(userId: string, filter: CommittedFilter): Promise<CommittedSchedule>;
};

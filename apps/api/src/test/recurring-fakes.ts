import { randomUUID } from "node:crypto";
import type { IsoDate, Occurrence, Recurring } from "@miplata/shared";
import type { RecurringRepository } from "../recurring/application/recurring-repository";

function unused(): Promise<never> {
  return Promise.reject(new Error("The recurring repository is not used in this test"));
}

export const unusedRecurring: RecurringRepository = {
  list: unused,
  find: unused,
  create: unused,
  update: unused,
  pause: unused,
  resume: unused,
  end: unused,
  generationCandidates: unused,
  insertOccurrences: unused,
  pendingOccurrences: unused,
  findOccurrence: unused,
  skip: unused,
};

type StoredRecurring = { userId: string; recurring: Recurring };

type StoredOccurrenceRow = {
  id: string;
  userId: string;
  recurringId: string;
  dueOn: IsoDate;
  status: string;
};

export function inMemoryRecurring() {
  const templates: StoredRecurring[] = [];
  const occurrences: StoredOccurrenceRow[] = [];

  const templateOf = (userId: string, recurringId: string) =>
    templates.find((item) => item.userId === userId && item.recurring.id === recurringId);

  function occurrenceOf(row: StoredOccurrenceRow, template: Recurring): Occurrence {
    return {
      id: row.id,
      recurringId: template.id,
      dueOn: row.dueOn,
      type: template.type,
      description: template.description,
      categoryId: template.categoryId,
      accountId: template.accountId,
      currency: template.currency,
      amountMode: template.amountMode,
      suggestedAmountMinor: template.amountMinor,
    };
  }

  function dropPending(userId: string, recurringId: string, after: IsoDate) {
    for (let index = occurrences.length - 1; index >= 0; index -= 1) {
      const row = occurrences[index] as StoredOccurrenceRow;
      if (
        row.userId === userId &&
        row.recurringId === recurringId &&
        row.status === "pending" &&
        row.dueOn > after
      ) {
        occurrences.splice(index, 1);
      }
    }
  }

  function change(userId: string, recurringId: string, changes: Partial<Recurring>) {
    const found = templateOf(userId, recurringId);
    if (!found) {
      return null;
    }
    found.recurring = { ...found.recurring, ...changes };
    return found.recurring;
  }

  const repository: RecurringRepository = {
    async list(userId) {
      return templates.filter((item) => item.userId === userId).map((item) => item.recurring);
    },
    async find(userId, recurringId) {
      return templateOf(userId, recurringId)?.recurring ?? null;
    },
    async create(userId, fields) {
      const recurring: Recurring = { ...fields, id: randomUUID(), isPaused: false };
      templates.push({ userId, recurring });
      return recurring;
    },
    async update(userId, recurringId, fields, today) {
      const updated = change(userId, recurringId, fields);
      if (updated) {
        dropPending(userId, recurringId, today);
      }
      return updated;
    },
    async pause(userId, recurringId, today) {
      const paused = change(userId, recurringId, { isPaused: true });
      if (paused) {
        dropPending(userId, recurringId, today);
      }
      return paused;
    },
    async resume(userId, recurringId) {
      return change(userId, recurringId, { isPaused: false });
    },
    async end(userId, recurringId, endsOn) {
      const ended = change(userId, recurringId, { endsOn });
      if (ended) {
        dropPending(userId, recurringId, endsOn);
      }
      return ended;
    },
    async generationCandidates(userId, recurringId) {
      return templates
        .filter(
          (item) =>
            item.userId === userId &&
            !item.recurring.isPaused &&
            (recurringId === undefined || item.recurring.id === recurringId),
        )
        .map((item) => ({
          recurring: item.recurring,
          latestDueOn:
            occurrences
              .filter((row) => row.recurringId === item.recurring.id)
              .map((row) => row.dueOn)
              .sort()
              .at(-1) ?? null,
        }));
    },
    async insertOccurrences(userId, rows) {
      for (const row of rows) {
        const exists = occurrences.some(
          (item) => item.recurringId === row.recurringId && item.dueOn === row.dueOn,
        );
        if (!exists) {
          occurrences.push({ id: randomUUID(), userId, ...row });
        }
      }
    },
    async pendingOccurrences(userId, through, type) {
      return occurrences
        .filter((row) => row.userId === userId && row.status === "pending" && row.dueOn <= through)
        .map((row) => ({ row, template: templateOf(userId, row.recurringId)?.recurring }))
        .filter((item): item is { row: StoredOccurrenceRow; template: Recurring } =>
          Boolean(item.template && (type === undefined || item.template.type === type)),
        )
        .sort((a, b) => a.row.dueOn.localeCompare(b.row.dueOn))
        .map((item) => occurrenceOf(item.row, item.template));
    },
    async findOccurrence(userId, occurrenceId) {
      const row = occurrences.find((item) => item.userId === userId && item.id === occurrenceId);
      const template = row ? templateOf(userId, row.recurringId)?.recurring : undefined;
      return row && template
        ? { occurrence: occurrenceOf(row, template), status: row.status }
        : null;
    },
    async skip(userId, occurrenceId) {
      const row = occurrences.find((item) => item.userId === userId && item.id === occurrenceId);
      if (!row) {
        return "not_found";
      }
      if (row.status !== "pending") {
        return "resolved";
      }
      row.status = "skipped";
      return "skipped";
    },
  };

  function claim(userId: string, occurrenceId: string): boolean {
    const row = occurrences.find((item) => item.userId === userId && item.id === occurrenceId);
    if (row?.status !== "pending") {
      return false;
    }
    row.status = "confirmed";
    return true;
  }

  return { repository, claim };
}

import { dateInMonth } from "@miplata/shared";
import type { RecurringRepository } from "../../recurring/application/recurring-repository";
import { recurringByMonth } from "../domain/recurring-commitments";
import type { RecurringCommitments } from "./report-use-cases";

export function recurringCommitmentsFrom(recurring: RecurringRepository): RecurringCommitments {
  return {
    async pendingByMonth(userId, filter) {
      const schedule = await recurring.committedSchedule(userId, {
        currency: filter.currency,
        from: `${filter.from}-01`,
        to: dateInMonth(filter.to, 31),
        accountId: filter.accountId,
        categoryId: filter.categoryId,
      });
      const templates = schedule.items.map(({ recurring: item, estimateMinor }) => ({
        recurringId: item.id,
        estimateMinor,
        rule: {
          frequency: item.frequency,
          dayOfMonth: item.dayOfMonth,
          monthOfYear: item.monthOfYear ?? undefined,
          startsOn: item.startsOn,
          endsOn: item.endsOn,
          isPaused: item.isPaused,
        },
      }));
      return recurringByMonth(templates, schedule.resolved, filter.from, filter.to);
    },
  };
}

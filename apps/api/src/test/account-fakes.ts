import { randomUUID } from "node:crypto";
import type { Account, Currency, Institution } from "@miplata/shared";
import type {
  AccountRepository,
  InstitutionRepository,
  NewAccount,
} from "../accounts/application/accounts";
import { inMemoryMovements } from "./movement-fakes";
import { unusedRecurring } from "./recurring-fakes";
import { emptyReports } from "./report-fakes";
import { inertStatements } from "./statement-fakes";

type StoredAccount = Account & { userId: string; posted: Map<Currency, number> };

export function inMemoryAccounts() {
  const rows: StoredAccount[] = [];

  function view(row: StoredAccount): Account {
    const { userId: _userId, posted, ...rest } = row;
    return {
      ...rest,
      canDelete: posted.size === 0,
      currencies: row.currencies.map((entry) => ({
        ...entry,
        balanceMinor: entry.openingBalanceMinor + (posted.get(entry.currency) ?? 0),
      })),
    };
  }

  function owned(userId: string, accountId: string) {
    return rows.find((row) => row.userId === userId && row.id === accountId);
  }

  const repository: AccountRepository = {
    async list(userId) {
      return rows.filter((row) => row.userId === userId).map(view);
    },
    async find(userId, accountId) {
      const row = owned(userId, accountId);
      return row ? view(row) : null;
    },
    async create(userId, draft: NewAccount) {
      const row: StoredAccount = {
        id: randomUUID(),
        userId,
        type: draft.type,
        name: draft.name,
        nameKey: null,
        institution: null,
        closingDay: draft.closingDay,
        dueDay: draft.dueDay,
        isActive: true,
        canDelete: true,
        currencies: draft.currencies.map((entry) => ({ ...entry, balanceMinor: 0 })),
        posted: new Map(),
      };
      rows.push(row);
      return view(row);
    },
    async update(userId, accountId, change) {
      const row = owned(userId, accountId);
      if (!row) {
        return null;
      }
      if (change.name !== undefined) {
        row.name = change.name;
        row.nameKey = null;
      }
      if (change.closingDay !== undefined) {
        row.closingDay = change.closingDay;
      }
      if (change.dueDay !== undefined) {
        row.dueDay = change.dueDay;
      }
      if (change.currencies) {
        row.currencies = change.currencies.map((entry) => ({ ...entry, balanceMinor: 0 }));
      }
      return view(row);
    },
    async setActive(userId, accountId, isActive) {
      const row = owned(userId, accountId);
      if (!row) {
        return null;
      }
      row.isActive = isActive;
      return view(row);
    },
    async remove(userId, accountId) {
      const row = owned(userId, accountId);
      if (!row) {
        return "not_found";
      }
      if (row.posted.size > 0) {
        return "in_use";
      }
      rows.splice(rows.indexOf(row), 1);
      return "deleted";
    },
    async postedCurrencies(userId, accountId) {
      return [...(owned(userId, accountId)?.posted.keys() ?? [])];
    },
  };

  function post(accountId: string, currency: Currency, amountMinor: number) {
    const row = rows.find((candidate) => candidate.id === accountId);
    row?.posted.set(currency, (row.posted.get(currency) ?? 0) + amountMinor);
  }

  return { repository, post };
}

export function inMemoryInstitutions(items: Institution[]): InstitutionRepository {
  return {
    list: async () => items,
    find: async (institutionId) => items.find((item) => item.id === institutionId) ?? null,
  };
}

export function unusedAccountDependencies() {
  const { repository } = inMemoryAccounts();
  return {
    accounts: {
      accounts: repository,
      everyAccount: repository,
      institutions: inMemoryInstitutions([]),
    },
    people: repository,
    movements: inMemoryMovements().repository,
    reports: emptyReports(),
    statements: inertStatements,
    today: () => "2026-11-23",
    recurring: unusedRecurring,
  };
}

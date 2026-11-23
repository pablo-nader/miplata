import type { Account, CreatePersonRequest, UpdatePersonRequest } from "@miplata/shared";
import {
  type AccountRepository,
  type AccountResult,
  createAccount,
  type InstitutionRepository,
  updateAccount,
} from "../../accounts/application/accounts";

const noInstitutions: InstitutionRepository = {
  list: async () => [],
  find: async () => null,
};

export function createPerson(
  people: AccountRepository,
  userId: string,
  request: CreatePersonRequest,
): Promise<AccountResult<Account>> {
  return createAccount(people, noInstitutions, userId, {
    type: "person",
    institutionId: null,
    name: request.name,
    closingDay: null,
    dueDay: null,
    currencies: request.currencies,
  });
}

export function updatePerson(
  people: AccountRepository,
  userId: string,
  personId: string,
  request: UpdatePersonRequest,
): Promise<AccountResult<Account>> {
  return updateAccount(people, noInstitutions, userId, personId, { ...request });
}

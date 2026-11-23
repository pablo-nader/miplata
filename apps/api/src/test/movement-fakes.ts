import { randomUUID } from "node:crypto";
import type { Movement } from "@miplata/shared";
import type { MovementRepository } from "../movements/application/movement-repository";
import type { MovementPlan } from "../movements/domain/movement-plan";

type Stored = { userId: string; movement: Movement };

function toMovement(id: string, plan: MovementPlan): Movement {
  const main = plan.postings[0];
  const second = plan.postings[1];
  const isTransfer = plan.type === "transfer";
  const leg = (posting: NonNullable<typeof main>) => ({
    accountId: posting.accountId,
    currency: posting.currency,
    amountMinor: Math.abs(posting.amountMinor),
  });
  const own = plan.installments.reduce((sum, item) => sum + item.ownAmountMinor, 0);
  return {
    id,
    type: plan.type,
    occurredOn: plan.occurredOn,
    description: plan.description,
    categoryId: plan.categoryId,
    account: !isTransfer && main ? leg(main) : null,
    from: isTransfer && main ? leg(main) : null,
    to: isTransfer && second ? leg(second) : null,
    person: !isTransfer && second ? { personId: second.accountId, ownAmountMinor: own } : null,
    installments: plan.installments.map((item) => ({
      number: item.number,
      periodMonth: item.periodMonth,
      statementId: null,
      amountMinor: item.amountMinor,
      ownAmountMinor: item.ownAmountMinor,
    })),
  };
}

export function inMemoryMovements() {
  const rows: Stored[] = [];
  const plans: MovementPlan[] = [];

  const repository: MovementRepository = {
    async statementOverrides() {
      return {};
    },
    async create(userId, plan) {
      const movement = toMovement(randomUUID(), plan);
      rows.push({ userId, movement });
      plans.push(plan);
      return movement;
    },
    async replace(userId, movementId, plan) {
      const row = rows.find((item) => item.userId === userId && item.movement.id === movementId);
      if (!row) {
        return null;
      }
      row.movement = toMovement(movementId, plan);
      plans.push(plan);
      return row.movement;
    },
    async find(userId, movementId) {
      return (
        rows.find((item) => item.userId === userId && item.movement.id === movementId)?.movement ??
        null
      );
    },
    async list(userId, query) {
      const owned = rows.filter((item) => item.userId === userId).map((item) => item.movement);
      const page = owned.slice(query.offset, query.offset + query.limit);
      return { items: page, hasMore: owned.length > query.offset + query.limit };
    },
    async remove(userId, movementId) {
      const index = rows.findIndex(
        (item) => item.userId === userId && item.movement.id === movementId,
      );
      if (index < 0) {
        return "not_found";
      }
      rows.splice(index, 1);
      return "deleted";
    },
    async monthRows() {
      return [];
    },
  };

  return { repository, plans };
}

import type { StatementRepository } from "../statements/application/statement-repository";

export const inertStatements: StatementRepository = {
  exclusive: (_userId, _statementId, work) => work(),
  async ensureOpen() {},
  async rows() {
    return [];
  },
  async find() {
    return null;
  },
  async amountLines() {
    return [];
  },
  async detailLines() {
    return { purchases: [], others: [], charges: [], payments: [] };
  },
  async updateDates() {
    return false;
  },
  async setBankFigures() {
    return false;
  },
};

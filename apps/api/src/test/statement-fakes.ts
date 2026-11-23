import type { StatementRepository } from "../statements/application/statement-repository";

export const inertStatements: StatementRepository = {
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

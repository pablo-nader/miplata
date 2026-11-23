import type { AccountError } from "../application/accounts";

type Failure = {
  status: 400 | 404 | 409;
  body: { error: string; reason?: string };
};

export const invalidRequest: Failure = { status: 400, body: { error: "invalid_request" } };

export const notFound: Failure = { status: 404, body: { error: "not_found" } };

export function accountFailure(error: AccountError): Failure {
  if (error === "not_found") {
    return notFound;
  }
  if (error === "account_in_use" || error === "currency_in_use") {
    return { status: 409, body: { error } };
  }
  return { status: 400, body: { error: "invalid_request", reason: error } };
}

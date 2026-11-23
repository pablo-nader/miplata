import type { SessionResolver } from "./auth-middleware";
import type { Auth } from "./create-auth";

export function sessionResolverFor(auth: Auth): SessionResolver {
  return async (headers) => {
    const result = await auth.api.getSession({ headers });
    return result?.user.id ?? null;
  };
}

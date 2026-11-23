import { type Locale, localeSchema } from "@miplata/shared";
import { authClient } from "./auth-client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  locale: Locale;
};

export type SessionState =
  | { status: "loading"; user: null; refresh: () => Promise<void> }
  | { status: "signedOut"; user: null; refresh: () => Promise<void> }
  | { status: "signedIn"; user: SessionUser; refresh: () => Promise<void> };

export function useSession(): SessionState {
  const { data, isPending, refetch } = authClient.useSession();
  const refresh = async () => {
    await refetch();
  };
  if (isPending) {
    return { status: "loading", user: null, refresh };
  }
  if (!data) {
    return { status: "signedOut", user: null, refresh };
  }
  const { id, name, email, image, locale } = data.user;
  return {
    status: "signedIn",
    user: {
      id,
      name,
      email,
      image: image ?? null,
      locale: localeSchema.catch("es").parse(locale),
    },
    refresh,
  };
}

import { boolean, check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { inList, LOCALES, primaryId } from "./shared";

const stamp = (name: string) => timestamp(name, { withTimezone: true });

export const user = pgTable(
  "user",
  {
    id: primaryId(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    locale: text("locale").default("es").notNull(),
    createdAt: stamp("created_at").defaultNow().notNull(),
    updatedAt: stamp("updated_at").defaultNow().notNull(),
  },
  () => [check("user_locale_check", inList("locale", LOCALES))],
);

export const session = pgTable(
  "session",
  {
    id: primaryId(),
    expiresAt: stamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: stamp("created_at").defaultNow().notNull(),
    updatedAt: stamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const authAccount = pgTable(
  "auth_account",
  {
    id: primaryId(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: stamp("access_token_expires_at"),
    refreshTokenExpiresAt: stamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: stamp("created_at").defaultNow().notNull(),
    updatedAt: stamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("auth_account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: primaryId(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: stamp("expires_at").notNull(),
    createdAt: stamp("created_at").defaultNow().notNull(),
    updatedAt: stamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"institution_id" uuid,
	"name_key" text,
	"name" text,
	"closing_day" integer,
	"due_day" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "account_type_check" CHECK ("type" in ('cash', 'bank', 'wallet', 'credit_card', 'person')),
	CONSTRAINT "account_name_check" CHECK (num_nonnulls("account"."name_key", "account"."name") = 1),
	CONSTRAINT "account_card_days_check" CHECK (("account"."type" = 'credit_card' and ("account"."closing_day" is null or "account"."closing_day" between 1 and 31) and ("account"."due_day" is null or "account"."due_day" between 1 and 31)) or ("account"."type" <> 'credit_card' and "account"."closing_day" is null and "account"."due_day" is null))
);
--> statement-breakpoint
CREATE TABLE "account_currency" (
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"opening_balance_minor" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "account_currency_account_id_currency_pk" PRIMARY KEY("account_id","currency"),
	CONSTRAINT "account_currency_currency_check" CHECK ("currency" in ('ARS', 'USD'))
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"logo_path" text,
	CONSTRAINT "institution_name_unique" UNIQUE("name"),
	CONSTRAINT "institution_kind_check" CHECK ("kind" in ('bank', 'wallet'))
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_locale_check" CHECK ("locale" in ('es', 'en'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"group_id" uuid,
	"currency" text NOT NULL,
	"limit_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_target_check" CHECK (num_nonnulls("budget"."category_id", "budget"."group_id") = 1),
	CONSTRAINT "budget_currency_check" CHECK ("currency" in ('ARS', 'USD')),
	CONSTRAINT "budget_limit_check" CHECK ("budget"."limit_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"group_id" uuid,
	"name_key" text,
	"name" text,
	"icon" text,
	"color" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "category_group_required_check" CHECK (("category"."type" = 'expense' and "category"."group_id" is not null) or ("category"."type" = 'income' and "category"."group_id" is null)),
	CONSTRAINT "category_name_check" CHECK (num_nonnulls("category"."name_key", "category"."name") = 1),
	CONSTRAINT "category_color_check" CHECK ("category"."color" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "category_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name_key" text,
	"name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_group_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "category_group_name_check" CHECK (num_nonnulls("category_group"."name_key", "category_group"."name") = 1)
);
--> statement-breakpoint
CREATE TABLE "installment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"movement_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"period_month" date NOT NULL,
	"statement_id" uuid,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"own_amount_minor" bigint NOT NULL,
	CONSTRAINT "installment_currency_check" CHECK ("currency" in ('ARS', 'USD')),
	CONSTRAINT "installment_number_check" CHECK ("installment"."number" >= 1),
	CONSTRAINT "installment_own_amount_check" CHECK ("installment"."own_amount_minor" between 0 and "installment"."amount_minor"),
	CONSTRAINT "installment_period_month_check" CHECK (extract(day from "installment"."period_month") = 1)
);
--> statement-breakpoint
CREATE TABLE "movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"occurred_on" date NOT NULL,
	"description" text,
	"category_id" uuid,
	"statement_id" uuid,
	"recurring_occurrence_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movement_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "movement_category_required_check" CHECK (("movement"."type" in ('income', 'expense') and "movement"."category_id" is not null) or ("movement"."type" = 'transfer' and "movement"."category_id" is null))
);
--> statement-breakpoint
CREATE TABLE "posting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"movement_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "posting_currency_check" CHECK ("currency" in ('ARS', 'USD'))
);
--> statement-breakpoint
CREATE TABLE "recurring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"frequency" text NOT NULL,
	"day_of_month" integer NOT NULL,
	"month_of_year" integer,
	"amount_mode" text NOT NULL,
	"amount_minor" bigint,
	"currency" text NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"description" text,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"is_paused" boolean DEFAULT false NOT NULL,
	CONSTRAINT "recurring_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "recurring_type_check" CHECK ("type" in ('income', 'expense')),
	CONSTRAINT "recurring_frequency_check" CHECK ("frequency" in ('monthly', 'bimonthly', 'yearly')),
	CONSTRAINT "recurring_currency_check" CHECK ("currency" in ('ARS', 'USD')),
	CONSTRAINT "recurring_day_check" CHECK ("recurring"."day_of_month" between 1 and 31),
	CONSTRAINT "recurring_month_check" CHECK (("recurring"."frequency" = 'yearly' and "recurring"."month_of_year" is not null and "recurring"."month_of_year" between 1 and 12) or ("recurring"."frequency" <> 'yearly' and "recurring"."month_of_year" is null)),
	CONSTRAINT "recurring_amount_check" CHECK (("recurring"."amount_mode" = 'fixed' and "recurring"."amount_minor" is not null and "recurring"."amount_minor" > 0) or ("recurring"."amount_mode" = 'variable' and ("recurring"."amount_minor" is null or "recurring"."amount_minor" > 0))),
	CONSTRAINT "recurring_range_check" CHECK ("recurring"."ends_on" is null or "recurring"."ends_on" >= "recurring"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "recurring_occurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recurring_id" uuid NOT NULL,
	"due_on" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"movement_id" uuid,
	CONSTRAINT "recurring_occurrence_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "recurring_occurrence_recurring_due_key" UNIQUE("recurring_id","due_on"),
	CONSTRAINT "recurring_occurrence_status_check" CHECK ("status" in ('pending', 'confirmed', 'skipped')),
	CONSTRAINT "recurring_occurrence_confirmed_check" CHECK (("recurring_occurrence"."status" = 'confirmed') = ("recurring_occurrence"."movement_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "statement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"closing_date" date NOT NULL,
	"due_date" date NOT NULL,
	"minimum_ars_minor" bigint,
	"minimum_usd_minor" bigint,
	"bank_total_ars_minor" bigint,
	"bank_total_usd_minor" bigint,
	CONSTRAINT "statement_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "statement_account_period_key" UNIQUE("account_id","period_month"),
	CONSTRAINT "statement_dates_check" CHECK ("statement"."due_date" >= "statement"."closing_date"),
	CONSTRAINT "statement_period_month_check" CHECK (extract(day from "statement"."period_month") = 1)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_currency" ADD CONSTRAINT "account_currency_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_currency" ADD CONSTRAINT "account_currency_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."account"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_category_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."category"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_group_fk" FOREIGN KEY ("user_id","group_id") REFERENCES "public"."category_group"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_group_fk" FOREIGN KEY ("user_id","group_id") REFERENCES "public"."category_group"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_group" ADD CONSTRAINT "category_group_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment" ADD CONSTRAINT "installment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment" ADD CONSTRAINT "installment_movement_fk" FOREIGN KEY ("user_id","movement_id") REFERENCES "public"."movement"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment" ADD CONSTRAINT "installment_statement_fk" FOREIGN KEY ("user_id","statement_id") REFERENCES "public"."statement"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement" ADD CONSTRAINT "movement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement" ADD CONSTRAINT "movement_category_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."category"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement" ADD CONSTRAINT "movement_statement_fk" FOREIGN KEY ("user_id","statement_id") REFERENCES "public"."statement"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement" ADD CONSTRAINT "movement_recurring_occurrence_fk" FOREIGN KEY ("user_id","recurring_occurrence_id") REFERENCES "public"."recurring_occurrence"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting" ADD CONSTRAINT "posting_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting" ADD CONSTRAINT "posting_movement_fk" FOREIGN KEY ("user_id","movement_id") REFERENCES "public"."movement"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting" ADD CONSTRAINT "posting_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."account"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring" ADD CONSTRAINT "recurring_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring" ADD CONSTRAINT "recurring_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."account"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring" ADD CONSTRAINT "recurring_category_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."category"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_recurring_fk" FOREIGN KEY ("user_id","recurring_id") REFERENCES "public"."recurring"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_movement_fk" FOREIGN KEY ("user_id","movement_id") REFERENCES "public"."movement"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement" ADD CONSTRAINT "statement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement" ADD CONSTRAINT "statement_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."account"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_user_name_key_key" ON "account" USING btree ("user_id","name_key") WHERE "account"."name_key" is not null;--> statement-breakpoint
CREATE INDEX "auth_account_user_id_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "category_user_type_name_key" ON "category" USING btree ("user_id","type","name") WHERE "category"."name" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "category_user_name_key_key" ON "category" USING btree ("user_id","name_key") WHERE "category"."name_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "category_group_user_name_key" ON "category_group" USING btree ("user_id","name") WHERE "category_group"."name" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "category_group_user_name_key_key" ON "category_group" USING btree ("user_id","name_key") WHERE "category_group"."name_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "installment_movement_number_key" ON "installment" USING btree ("movement_id","number");--> statement-breakpoint
CREATE INDEX "installment_user_period_idx" ON "installment" USING btree ("user_id","period_month");--> statement-breakpoint
CREATE INDEX "installment_user_statement_idx" ON "installment" USING btree ("user_id","statement_id");--> statement-breakpoint
CREATE INDEX "movement_user_occurred_on_idx" ON "movement" USING btree ("user_id","occurred_on" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "movement_recurring_occurrence_key" ON "movement" USING btree ("recurring_occurrence_id") WHERE "movement"."recurring_occurrence_id" is not null;--> statement-breakpoint
CREATE INDEX "movement_user_category_idx" ON "movement" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "movement_description_trgm_idx" ON "movement" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "posting_user_account_currency_idx" ON "posting" USING btree ("user_id","account_id","currency");--> statement-breakpoint
CREATE INDEX "posting_user_movement_idx" ON "posting" USING btree ("user_id","movement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_occurrence_movement_key" ON "recurring_occurrence" USING btree ("movement_id") WHERE "recurring_occurrence"."movement_id" is not null;
--> statement-breakpoint
INSERT INTO "institution" ("kind", "name") VALUES
	('bank', 'Banco Nación'),
	('bank', 'Banco Provincia'),
	('bank', 'Galicia'),
	('bank', 'Santander'),
	('bank', 'BBVA'),
	('bank', 'Macro'),
	('bank', 'Banco Ciudad'),
	('bank', 'Credicoop'),
	('bank', 'ICBC'),
	('bank', 'Patagonia'),
	('bank', 'Supervielle'),
	('bank', 'Brubank'),
	('wallet', 'Mercado Pago'),
	('wallet', 'Ualá'),
	('wallet', 'Naranja X'),
	('wallet', 'Cuenta DNI'),
	('wallet', 'Personal Pay'),
	('wallet', 'Prex'),
	('wallet', 'Lemon')
ON CONFLICT ("name") DO NOTHING;

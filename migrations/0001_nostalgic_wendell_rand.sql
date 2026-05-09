CREATE TABLE "custom_invoice_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text,
	"client_email" text,
	"name" text NOT NULL,
	"base_template" text NOT NULL,
	"primary_color" text DEFAULT '#667eea',
	"accent_color" text DEFAULT '#764ba2',
	"background_color" text DEFAULT '#ffffff',
	"text_color" text DEFAULT '#333333',
	"logo_url" text,
	"company_header_text" text,
	"footer_text" text,
	"show_project_name" boolean DEFAULT false,
	"show_po_number" boolean DEFAULT false,
	"show_work_order_number" boolean DEFAULT false,
	"custom_field_1_name" text,
	"custom_field_1_value" text,
	"custom_field_2_name" text,
	"custom_field_2_value" text,
	"font_family" text DEFAULT 'system',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "early_access" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"trade" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "early_access_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "referral_bonuses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"successful_referrals" integer DEFAULT 0,
	"bonus_earned_at" timestamp with time zone,
	"bonus_redeemed_at" timestamp with time zone,
	"bonus_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_bonuses_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_conversions" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"referral_code" text NOT NULL,
	"status" text DEFAULT 'pending',
	"converted_at" timestamp with time zone,
	"bonus_claimed_at" timestamp with time zone,
	"bonus_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_processed" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "webhook_processed_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client_name" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client_email" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client_phone" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client_address" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "job_address" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "job_description" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "items" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "labor_hours" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "labor_rate" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "labor_total" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "materials_total" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "items_total" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "safety_notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "day6_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method_type_override" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_account_number_override" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_bank_name_override" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_account_name_override" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_link_override" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_instructions_override" text;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "default_tax_profile_id" text;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "invoice_template" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "default_payment_terms" text DEFAULT 'Due upon receipt';--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "late_payment_reminders" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "auto_remind_frequency" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "preferences" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_tax_rate" numeric(5, 2) DEFAULT '8.00';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invoice_template" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_payment_terms" text DEFAULT 'Due upon receipt';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_method_type" text DEFAULT 'custom';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_account_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_bank_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_account_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_link" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_instructions" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "custom_invoice_templates" ADD CONSTRAINT "custom_invoice_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripe_price_id";
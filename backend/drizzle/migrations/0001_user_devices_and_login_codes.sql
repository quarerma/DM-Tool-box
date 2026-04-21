CREATE TABLE "login_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"user_id" integer NOT NULL,
	"device_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"fingerprint_hash" text NOT NULL,
	"fingerprint_data" jsonb NOT NULL,
	"device_id" text NOT NULL,
	"user_agent" text NOT NULL,
	"device_secret_hash" text NOT NULL,
	"last_login" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"authenticated" boolean DEFAULT false,
	CONSTRAINT "user_devices_user_id_device_id_unique" UNIQUE("user_id","device_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twofa_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
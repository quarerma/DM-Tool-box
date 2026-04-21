CREATE TABLE "auth_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"device_id" text,
	"event_type" varchar(64) NOT NULL,
	"ip" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_events_user_id_created_at_idx" ON "auth_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_events_event_type_created_at_idx" ON "auth_events" USING btree ("event_type","created_at");
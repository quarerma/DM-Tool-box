CREATE TABLE "music_track" (
	"id" serial PRIMARY KEY NOT NULL,
	"alt_name" varchar(255) NOT NULL,
	"loop_start" integer DEFAULT 0,
	"loop_end" integer DEFAULT 0,
	"replay" boolean DEFAULT true NOT NULL,
	"url" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"update_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_track" ADD CONSTRAINT "music_track_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
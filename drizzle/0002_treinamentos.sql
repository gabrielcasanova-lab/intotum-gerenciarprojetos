CREATE TABLE "training_videos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"recorded_on" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_videos" ADD CONSTRAINT "training_videos_project_client_id_project_clients_id_fk" FOREIGN KEY ("project_client_id") REFERENCES "public"."project_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_videos" ADD CONSTRAINT "training_videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_videos_pc_idx" ON "training_videos" USING btree ("project_client_id");
CREATE TYPE "public"."implementation_status" AS ENUM('iniciado', 'finalizado', 'cancelado');--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "visibility" "comment_visibility" DEFAULT 'interno' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_clients" ADD COLUMN "status" "implementation_status" DEFAULT 'iniciado' NOT NULL;
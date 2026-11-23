CREATE TYPE "public"."language" AS ENUM('pt', 'es');--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "language" "language" DEFAULT 'pt' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "language" "language" DEFAULT 'pt' NOT NULL;
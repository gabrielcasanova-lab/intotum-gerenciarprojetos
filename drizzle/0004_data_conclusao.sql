ALTER TABLE "activities" ADD COLUMN "completed_on" date;--> statement-breakpoint
-- Atividades já concluídas: a data de conclusão vem do registro de quando foram concluídas.
UPDATE "activities" SET "completed_on" = ("completed_at" AT TIME ZONE 'America/Sao_Paulo')::date WHERE "status" = 'concluido' AND "completed_at" IS NOT NULL;

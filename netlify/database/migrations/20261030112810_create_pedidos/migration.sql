CREATE TABLE "pedidos" (
	"id" serial PRIMARY KEY,
	"protocolo" text NOT NULL UNIQUE,
	"tipo_id" text NOT NULL,
	"tipo" text NOT NULL,
	"imovel" text NOT NULL,
	"situacao" text NOT NULL,
	"cep" text DEFAULT '' NOT NULL,
	"endereco" text NOT NULL,
	"complemento" text DEFAULT '' NOT NULL,
	"cidade" text NOT NULL,
	"data" text NOT NULL,
	"horario" text,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"papel" text NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'novo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pedidos_status_idx" ON "pedidos" ("status");--> statement-breakpoint
CREATE INDEX "pedidos_created_idx" ON "pedidos" ("created_at");
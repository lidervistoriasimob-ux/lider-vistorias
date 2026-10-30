import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const pedidos = pgTable(
  "pedidos",
  {
    id: serial().primaryKey(),
    protocolo: text().notNull().unique(),
    tipoId: text("tipo_id").notNull(),
    tipo: text().notNull(),
    imovel: text().notNull(),
    situacao: text().notNull(),
    cep: text().notNull().default(""),
    endereco: text().notNull(),
    complemento: text().notNull().default(""),
    cidade: text().notNull(),
    data: text().notNull(),
    horario: text(),
    nome: text().notNull(),
    telefone: text().notNull(),
    papel: text().notNull(),
    observacoes: text().notNull().default(""),
    status: text().notNull().default("novo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pedidos_status_idx").on(t.status), index("pedidos_created_idx").on(t.createdAt)],
);

export type Pedido = typeof pedidos.$inferSelect;

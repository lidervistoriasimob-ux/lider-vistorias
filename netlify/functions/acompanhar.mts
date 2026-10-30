import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pedidos } from "../../db/schema.js";
import { json, digits } from "../lib/http.js";

// Consulta pública: exige o protocolo e os 4 últimos dígitos do WhatsApp informado no pedido.
export default async (req: Request) => {
  const url = new URL(req.url);
  const protocolo = String(url.searchParams.get("protocolo") ?? "").trim().toUpperCase();
  const final = digits(url.searchParams.get("tel")).slice(-4);
  if (!protocolo || final.length !== 4) return json({ error: "Informe o protocolo e os 4 últimos dígitos do WhatsApp." }, 400);

  const [row] = await db.select().from(pedidos).where(eq(pedidos.protocolo, protocolo)).limit(1);
  if (!row || !digits(row.telefone).endsWith(final)) return json({ error: "Pedido não encontrado. Confira os dados." }, 404);

  return json({
    protocolo: row.protocolo,
    tipo: row.tipo,
    tipoId: row.tipoId,
    imovel: row.imovel,
    situacao: row.situacao,
    cidade: row.cidade,
    data: row.data,
    horario: row.horario,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};

export const config: Config = { path: "/api/acompanhar" };

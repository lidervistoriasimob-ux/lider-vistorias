import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pedidos } from "../../db/schema.js";
import { STATUS } from "../../shared/catalogo.js";
import { json, requireAdmin } from "../lib/http.js";

export default async (req: Request, context: Context) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const protocolo = context.params.protocolo;

  if (req.method === "PATCH") {
    const { status } = await req.json().catch(() => ({}));
    if (typeof status !== "string" || !Object.hasOwn(STATUS, status)) return json({ error: "Status inválido." }, 422);
    const [row] = await db
      .update(pedidos)
      .set({ status, updatedAt: new Date() })
      .where(eq(pedidos.protocolo, protocolo))
      .returning();
    return row ? json(row) : json({ error: "Pedido não encontrado." }, 404);
  }

  if (req.method === "DELETE") {
    await db.delete(pedidos).where(eq(pedidos.protocolo, protocolo));
    return json({ ok: true });
  }

  return json({ error: "Método não permitido." }, 405);
};

export const config: Config = { path: "/api/pedidos/:protocolo" };

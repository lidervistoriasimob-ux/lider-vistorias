import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pedidos } from "../../db/schema.js";
import { TIPOS, IMOVEIS, SITUACOES, PAPEIS, HORARIOS } from "../../shared/catalogo.js";
import { json, requireAdmin, digits, clean } from "../lib/http.js";

function protocolo() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return "LV-" + s;
}

export default async (req: Request) => {
  if (req.method === "GET") {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const rows = await db.select().from(pedidos).orderBy(desc(pedidos.createdAt)).limit(500);
    return json(rows);
  }

  if (req.method === "POST") {
    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return json({ error: "Pedido inválido." }, 400);
    }
    if (clean(b.website)) return json({ error: "Pedido inválido." }, 400); // honeypot
    const tipo = TIPOS.find((t) => t.id === b.tipoId);
    const tel = digits(b.telefone);
    const data = clean(b.data, 10);
    const horario = b.horario ? clean(b.horario, 5) : null;
    const erros: string[] = [];
    if (!tipo) erros.push("tipo de vistoria");
    if (!IMOVEIS.includes(String(b.imovel))) erros.push("tipo de imóvel");
    if (!SITUACOES.includes(String(b.situacao))) erros.push("situação");
    if (!PAPEIS.includes(String(b.papel))) erros.push("papel");
    if (clean(b.endereco).length < 4) erros.push("endereço");
    if (clean(b.cidade).length < 2) erros.push("bairro e cidade");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) erros.push("data");
    if (horario && !HORARIOS.includes(horario)) erros.push("horário");
    if (clean(b.nome).length < 3) erros.push("nome");
    if (tel.length < 10 || tel.length > 11) erros.push("WhatsApp");
    if (erros.length) return json({ error: "Confira: " + erros.join(", ") + "." }, 422);

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        const [row] = await db
          .insert(pedidos)
          .values({
            protocolo: protocolo(),
            tipoId: tipo!.id,
            tipo: tipo!.n,
            imovel: String(b.imovel),
            situacao: String(b.situacao),
            cep: digits(b.cep).slice(0, 8),
            endereco: clean(b.endereco),
            complemento: clean(b.complemento, 80),
            cidade: clean(b.cidade, 120),
            data,
            horario,
            nome: clean(b.nome, 120),
            telefone: clean(b.telefone, 20),
            papel: String(b.papel),
            observacoes: clean(b.observacoes, 1000),
          })
          .returning();
        return json(row, 201);
      } catch (e) {
        if (tentativa === 2) {
          console.error("Falha ao salvar pedido", e);
          return json({ error: "Não foi possível registrar o pedido agora." }, 500);
        }
      }
    }
  }

  return json({ error: "Método não permitido." }, 405);
};

export const config: Config = { path: "/api/pedidos" };

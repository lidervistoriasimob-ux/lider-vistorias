import { getUser } from "@netlify/identity";

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function requireAdmin() {
  const user = await getUser();
  if (!user) return { error: json({ error: "Faça login para continuar." }, 401) };
  const roles = user.roles ?? (user.appMetadata as { roles?: string[] } | undefined)?.roles ?? [];
  if (!roles.includes("admin")) return { error: json({ error: "Sua conta não tem acesso ao painel." }, 403) };
  return { user };
}

export const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
export const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

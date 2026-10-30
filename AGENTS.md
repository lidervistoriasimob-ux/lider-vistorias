# AGENTS.md — Líder Vistorias

## Arquitetura

- Single page app sem framework: `index.html` contém todas as telas (`section.view`), alternadas por hash (`#inicio`, `#solicitar`, `#acompanhar`, `#ajuda`, `#painel`) em `route()` de `src/main.js`.
- Vite empacota o front-end (`npm run build` → `dist/`). Netlify Functions em `netlify/functions/` servem a API.
- Persistência: Netlify Database (Postgres) via Drizzle. Esquema em `db/schema.ts`, cliente em `db/index.ts`, migrations em `netlify/database/migrations/` (gere com `npx drizzle-kit generate --name <nome>`; nunca edite migrations aplicadas nem rode migrate/push).
- Autenticação: Netlify Identity (`@netlify/identity`). Só usuários com role `admin` acessam o painel; checado no servidor em `netlify/lib/http.ts` (`requireAdmin`). O marcador `.netlify/features/netlify-identity` ativa o recurso no deploy — não remova.

## Diretórios

- `src/main.js` — tema, rotas, wizard de pedido, sucesso, acompanhamento, checklist.
- `src/painel.js` — carregado sob demanda: login, callbacks de convite/recuperação, painel de pedidos, CSV.
- `src/util.js` — helpers (máscaras, datas, mensagem de WhatsApp, `.ics`, `api()`).
- `src/icons.js` — sprite SVG injetado no `<body>`; use `IC(nome)` no JS e `<use href="#i-nome">` no HTML.
- `src/styles.css` — design system (variáveis CSS, temas claro/escuro).
- `shared/catalogo.js` — tipos de vistoria, opções, horários, status e WhatsApp; usado pelo front e pelas funções (fonte única para validação).
- `netlify/functions/` — `pedidos.mts` (POST público / GET admin), `pedido.mts` (PATCH/DELETE admin), `acompanhar.mts` (consulta pública por protocolo + 4 dígitos do telefone).
- `public/img/` — logo transparente (horizontal e emblema) e fotos geradas; sempre referenciadas via `/.netlify/images?url=...&fm=webp`.

## Convenções

- Interface e mensagens em português do Brasil. Campos da API/banco também em português (`tipoId`, `endereco`, `horario`...).
- Status: `novo` (exibido ao cliente como "Recebido"), `confirmado`, `concluido`, `cancelado`.
- Estética "noir & ouro": serifa Cormorant Garamond para títulos, Manrope no texto, dourado via `var(--goldg)`. Mantenha os tokens em `:root`.
- O cliente não tem conta; o histórico local fica em `localStorage` (`lv.pedidos`, `lv.contato`, `lv.prep`, `lv.theme`).
- O envio pelo WhatsApp continua sendo o canal principal de aviso ao responsável; o banco garante o registro e o painel.

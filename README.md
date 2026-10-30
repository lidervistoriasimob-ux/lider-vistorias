# Líder Vistorias

App de agendamento de vistorias de imóveis da Líder Vistorias, com identidade visual premium (preto e dourado), pensado primeiro para o celular e adaptado para desktop.

## O que o app faz

- **Início** — apresentação da marca, serviços, como funciona, conteúdo do laudo e público atendido.
- **Solicitar** — pedido em 3 etapas (serviço e imóvel → endereço com busca por CEP, data e horário → dados de contato). O pedido é salvo e recebe um protocolo; o cliente pode encaminhá-lo pelo WhatsApp e salvá-lo na agenda do celular (.ics).
- **Acompanhar** — consulta de status pelo protocolo + 4 últimos dígitos do WhatsApp, com linha do tempo. Os pedidos feitos no aparelho ficam listados automaticamente.
- **Ajuda** — checklist interativo de preparação, perguntas frequentes e contato direto.
- **Painel do responsável** — login protegido, indicadores, busca, filtros, confirmar/concluir/cancelar/reabrir, responder pelo WhatsApp, copiar, remover e exportar planilha (CSV).
- Tema claro/escuro, botão flutuante de WhatsApp e instalação como app (manifest).

## Tecnologias

- HTML, CSS e JavaScript puro, empacotados com **Vite**
- **Netlify Functions** (API em `/api/*`)
- **Netlify Database** (Postgres) com **Drizzle ORM**
- **Netlify Identity** (`@netlify/identity`) para o login do responsável
- **Netlify Image CDN** para servir as imagens otimizadas
- ViaCEP (consulta pública) para preencher o endereço pelo CEP

## Rodando localmente

```bash
npm install
netlify dev
```

Use `netlify dev` (e não apenas `vite`) para que as funções, o banco, o login e o Image CDN funcionem localmente.

## Primeiro acesso ao painel

1. No painel da Netlify, abra **Identity** e clique em **Invite users** com o e-mail do responsável.
2. Aceite o convite pelo link recebido e crie a senha (o app abre a tela de senha automaticamente).
3. Ainda em **Identity**, abra o usuário e adicione o papel (role) `admin`.
4. Recomendado: em **Project configuration › Identity**, deixe o cadastro como **Invite only**.

Depois disso, acesse **Área do responsável** no rodapé (ou `/#painel`).

## Configuração

O número de WhatsApp, horários disponíveis e tipos de vistoria ficam em `shared/catalogo.js`.
